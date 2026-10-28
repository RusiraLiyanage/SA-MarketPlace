import { Injectable } from '@nestjs/common'
import { BusinessException, TRANSIT_DAYS } from '@sa-marketplace/common'
import {
  Cart,
  CartItem,
  Delivery,
  Order,
  OrderItem,
  OrderStatus,
  Payment,
  PaymentMethod,
  Product,
  User,
} from '@sa-marketplace/entities'
import { DataSource, EntityManager } from 'typeorm'
import { fromCents, gstIncludedInCents, toCents } from '../../utils/money'
import { isProductOrderable } from '../products/products.visibility'
import { DeliveryDto, PlaceOrderDto } from './checkout.dto'
import { CheckoutError } from './checkout.exception'
import {
  CheckoutResult,
  DeliveryView,
  PaymentResult,
  PaymentView,
  PlacedGroup,
  PlacedOrder,
  SupplierGroup,
} from './checkout.typing'
import { PaymentService } from './payment.service'

@Injectable()
export class CheckoutService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly paymentService: PaymentService,
  ) {}

  // POST checkout — turns the cart into one order per supplier, all or nothing.
  // The cart comes from userId (the token), never from the request body (§7).
  placeOrder(userId: string, dto: PlaceOrderDto): Promise<CheckoutResult> {
    // Step 1: open a transaction (dataSource.transaction); everything below is all or nothing.
    return this.dataSource.transaction(async (manager) => {
      // Step 2: load the buyer; organisationId is copied onto every order.
      const buyer = await manager
        .getRepository(User)
        .findOneByOrFail({ id: userId })

      // Step 3: loadCartLines(); an empty cart is CART_EMPTY.
      const lines = await this.loadCartLines(manager, userId)
      if (lines.length === 0) {
        throw new BusinessException(
          CheckoutError.CART_EMPTY.code,
          CheckoutError.CART_EMPTY.message,
        )
      }

      // Step 4: assertOrderable(): visible, approved supplier, enough stock, else ITEMS_UNAVAILABLE.
      this.assertOrderable(lines)

      // Step 5: groupBySupplier(): one group becomes one order (CLAUDE.md §4.3).
      const groups = this.groupBySupplier(lines)

      // Step 6: reserveStock(): take the stock first, so a sold-out line never triggers a charge.
      await this.reserveStock(manager, lines)

      // Step 7: paymentService.charge() once, for the grand total of every group.
      const grandTotalCents = lines.reduce(
        (sum, line) => sum + toCents(line.product.price) * line.quantity,
        0,
      )
      const paymentResult = await this.paymentService.charge(
        grandTotalCents,
        dto.payment,
      )

      // Step 8: for each group: createOrder(), createDelivery(), createPayment().
      const placedAt = new Date()
      const placed: PlacedGroup[] = []
      for (const group of groups) {
        const order = await this.createOrder(manager, buyer, group, placedAt)
        const delivery = await this.createDelivery(
          manager,
          order,
          group,
          dto.delivery,
          placedAt,
        )
        await this.createPayment(
          manager,
          order,
          dto.payment.method,
          paymentResult,
        )
        placed.push({ order, group, delivery })
      }

      // Step 9: delete the cart items (the cart row stays).
      await manager.getRepository(CartItem).delete(lines.map((line) => line.id))

      // Step 10: once the transaction has committed, return buildResult().
      return this.buildResult(placed, dto.payment.method, paymentResult)
    })
  }

  // Locks the cart row, then reads the lines. Runs inside the checkout transaction.
  private async loadCartLines(
    manager: EntityManager,
    userId: string,
  ): Promise<CartItem[]> {
    // Step 1: lock the cart row (see CartService.withCartLock), so a double-click on
    //         Place order queues up; the second one then finds an empty cart.
    const cart = await manager.getRepository(Cart).findOne({
      where: { userId },
      lock: { mode: 'pessimistic_write' },
    })
    // No cart row at all means nothing was ever added to it — same as an empty one.
    if (!cart) {
      return []
    }

    // Step 2: load the cart items joined to product and supplierProfile (live data).
    return await manager.getRepository(CartItem).find({
      where: { cartId: cart.id },
      relations: { product: { supplierProfile: true } },
    })
  }

  // Throws ITEMS_UNAVAILABLE, naming every line that failed.
  private assertOrderable(lines: CartItem[]): void {
    // Step 1: each product must be published, with an approved supplier (same rule as
    //         ProductsService.visibleProductsQuery; share it rather than copy it).
    const hidden = new Set(
      lines.filter((line) => !isProductOrderable(line.product)),
    )

    // Step 2: each quantity must be within product.quantity.
    const overStock = new Set(
      lines.filter((line) => line.quantity > line.product.quantity),
    )

    // Step 3: collect the failing lines and throw once, so the buyer sees them all.
    const unavailable = lines.filter(
      (line) => hidden.has(line) || overStock.has(line),
    )
    if (unavailable.length > 0) {
      const names = unavailable.map((line) => line.product.name).join(', ')
      throw new BusinessException(
        CheckoutError.ITEMS_UNAVAILABLE.code,
        `${CheckoutError.ITEMS_UNAVAILABLE.message}: ${names}`,
      )
    }
  }

  private groupBySupplier(lines: CartItem[]): SupplierGroup[] {
    // Step 1: group the lines by product.supplierProfile.id.
    const groups = new Map<string, SupplierGroup>()
    for (const line of lines) {
      const supplier = line.product.supplierProfile
      const group = groups.get(supplier.id)
      if (group) {
        group.lines.push(line)
      } else {
        groups.set(supplier.id, { supplier, lines: [line] })
      }
    }

    // Step 2: return one { supplier, lines } per supplier.
    return [...groups.values()]
  }

  // The only place stock goes down (CLAUDE.md §4.5).
  private async reserveStock(
    manager: EntityManager,
    lines: CartItem[],
  ): Promise<void> {
    // Sorted by productId so concurrent checkouts lock rows in the same order and cannot deadlock.
    const sortedLines = [...lines].sort((a, b) =>
      a.productId.localeCompare(b.productId),
    )

    for (const line of sortedLines) {
      // Step 1: per line, UPDATE product SET quantity = quantity - n WHERE id = ? AND quantity >= n.
      const result = await manager
        .createQueryBuilder()
        .update(Product)
        .set({ quantity: () => 'quantity - :n' })
        .where('id = :id AND quantity >= :n', {
          id: line.productId,
          n: line.quantity,
        })
        .execute()

      // Step 2: if no row was changed, someone else took the stock first: INSUFFICIENT_STOCK.
      if (result.affected !== 1) {
        throw new BusinessException(
          CheckoutError.INSUFFICIENT_STOCK.code,
          `${CheckoutError.INSUFFICIENT_STOCK.message}: ${line.product.name}`,
        )
      }
    }

    // Step 3: do not touch inventory; that grows on delivery, not on placement.
  }

  // Needs the order_number_seq migration: a sequence never hands out the same number
  // twice, unlike count() + 1.
  private async nextOrderNumber(manager: EntityManager): Promise<string> {
    // Step 1: SELECT nextval('order_number_seq').
    // A plain sequence, not gapless: a rolled-back checkout still consumes a number,
    // which is what makes it safe under concurrency (ADR — see DATABASE.md §6.11).
    const [{ value }] = (await manager.query(
      `SELECT nextval('order_number_seq') AS value`,
    )) as [{ value: string }]

    // Step 2: format as ORD-<year>-<number padded to 5>, e.g. ORD-2026-00129.
    const year = new Date().getFullYear()
    return `ORD-${year}-${value.padStart(5, '0')}`
  }

  // The order row plus its order_items. Prices are frozen here (CLAUDE.md §4.2).
  private async createOrder(
    manager: EntityManager,
    buyer: User,
    group: SupplierGroup,
    placedAt: Date,
  ): Promise<Order> {
    // Step 1: nextOrderNumber().
    const orderNumber = await this.nextOrderNumber(manager)

    // Step 2: totals in cents (utils/money): subtotal, gstTotal = total / 11, total.
    // total is the sum of the (already GST-inclusive) line prices — never add GST on top.
    const totalCents = group.lines.reduce(
      (sum, line) => sum + toCents(line.product.price) * line.quantity,
      0,
    )
    const gstTotalCents = gstIncludedInCents(totalCents)
    // subtotal is total MINUS the GST already inside it, not the other way round.
    const subtotalCents = totalCents - gstTotalCents

    // Step 3: save the order: status placed, buyer, organisationId, supplier, totals.
    const order = await manager.getRepository(Order).save({
      orderNumber,
      userId: buyer.id,
      organisationId: buyer.organisationId,
      supplierProfileId: group.supplier.id,
      status: OrderStatus.placed,
      subtotal: fromCents(subtotalCents),
      gstTotal: fromCents(gstTotalCents),
      total: fromCents(totalCents),
      placedAt,
    })

    // Step 4: save an order_item per line, copying name, sku and the price as it is now.
    // Copied, not referenced — a later product-price change must never touch this row
    // (the price freeze, CLAUDE.md §4.2).
    await manager.getRepository(OrderItem).save(
      group.lines.map((line) => ({
        orderId: order.id,
        productId: line.product.id,
        productName: line.product.name,
        sku: line.product.sku,
        quantity: line.quantity,
        unitPriceAtPurchase: line.product.price,
        lineTotal: fromCents(toCents(line.product.price) * line.quantity),
      })),
    )

    return order
  }

  private async createDelivery(
    manager: EntityManager,
    order: Order,
    group: SupplierGroup,
    delivery: DeliveryDto,
    placedAt: Date,
  ): Promise<Delivery> {
    // Step 1: estimatedDeliveryAt = placedAt + supplier.dispatchSlaHours + TRANSIT_DAYS.
    const estimatedAt = new Date(
      placedAt.getTime() +
        group.supplier.dispatchSlaHours * 60 * 60 * 1000 +
        TRANSIT_DAYS * 24 * 60 * 60 * 1000,
    )

    // Step 2: save the delivery row: the address from the request, tied to this order.
    return await manager.getRepository(Delivery).save({
      orderId: order.id,
      attentionName: delivery.attentionName ?? null,
      streetAddress: delivery.streetAddress,
      suburb: delivery.suburb,
      state: delivery.state,
      postcode: delivery.postcode,
      notes: delivery.notes ?? null,
      estimatedDeliveryAt: estimatedAt,
    })
  }

  // One payment row per order, each with that order's own amount.
  private async createPayment(
    manager: EntityManager,
    order: Order,
    method: PaymentMethod,
    result: PaymentResult,
  ): Promise<Payment> {
    // Step 1: amount = order.total; the transaction reference is shared by all orders.
    const amount = order.total
    const { transactionReference } = result

    // Step 2: save the row with method, status, cardLast4, cardBrand and paidAt.
    return await manager.getRepository(Payment).save({
      orderId: order.id,
      method,
      status: result.status,
      amount,
      transactionReference,
      cardLast4: result.cardLast4,
      cardBrand: result.cardBrand,
      paidAt: result.paidAt,
    })
  }

  // The result returned after a successful checkout.
  private buildResult(
    placed: PlacedGroup[],
    method: PaymentMethod,
    payment: PaymentResult,
  ): CheckoutResult {
    // Step 1: one PlacedOrder per group: number, items, totals, estimated delivery.
    // Line items are rebuilt from group.lines, not re-read from order_item — they
    // hold the same values createOrder just wrote, so no extra query is needed.
    const orders: PlacedOrder[] = placed.map(({ order, group, delivery }) => ({
      orderNumber: order.orderNumber,
      placedAt: order.placedAt,
      supplierName: group.supplier.businessName,
      items: group.lines.map((line) => ({
        productId: line.product.id,
        name: line.product.name,
        sku: line.product.sku,
        quantity: line.quantity,
        unitPrice: line.product.price,
        lineTotal: fromCents(toCents(line.product.price) * line.quantity),
      })),
      subtotal: order.subtotal,
      gstTotal: order.gstTotal,
      total: order.total,
      estimatedDeliveryAt: delivery.estimatedDeliveryAt,
    }))

    // Step 2: the delivery address once, the payment view once (no card data).
    // Every group was given the same delivery address, so any one row will do.
    const address = placed[0].delivery
    const deliveryView: DeliveryView = {
      attentionName: address.attentionName,
      streetAddress: address.streetAddress,
      suburb: address.suburb,
      state: address.state,
      postcode: address.postcode,
      country: address.country,
      notes: address.notes,
    }
    const paymentView: PaymentView = {
      method,
      status: payment.status,
      cardBrand: payment.cardBrand,
      cardLast4: payment.cardLast4,
      transactionReference: payment.transactionReference,
      paidAt: payment.paidAt,
    }

    // Step 3: grand total and the GST inside it (utils/money).
    const totalCents = placed.reduce(
      (sum, { order }) => sum + toCents(order.total),
      0,
    )

    return {
      orders,
      delivery: deliveryView,
      payment: paymentView,
      total: fromCents(totalCents),
      gstIncluded: fromCents(gstIncludedInCents(totalCents)),
    }
  }
}
