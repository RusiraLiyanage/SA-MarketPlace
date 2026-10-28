import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import {
  BusinessException,
  InvoiceDownload,
  InvoiceService,
  PagingMetaDto,
  TPagingResDto,
} from '@sa-marketplace/common'
import { Delivery, Order, OrderItem, Payment } from '@sa-marketplace/entities'
import { In, Repository } from 'typeorm'
import { CartService } from '../cart/cart.service'
import { ListOrdersQueryDto, ORDER_SORT_COLUMNS } from './orders.dto'
import { OrdersError } from './orders.exception'
import {
  OrderDetail,
  OrderSummary,
  ReorderLineResult,
  ReorderResult,
} from './orders.typing'

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Delivery)
    private readonly deliveryRepository: Repository<Delivery>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly cartService: CartService,
    private readonly invoiceService: InvoiceService,
  ) {}

  // GET /orders — this buyer's own orders only; userId comes from the token (§7).
  async listMyOrders(
    userId: string,
    query: ListOrdersQueryDto,
  ): Promise<TPagingResDto<OrderSummary>> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .innerJoinAndSelect('order.supplierProfile', 'supplierProfile')
      .where('order.userId = :userId', { userId })

    if (query.status) {
      queryBuilder.andWhere('order.status = :status', {
        status: query.status,
      })
    }

    const term = query.search?.trim()
    if (term) {
      // Escape LIKE wildcards so "%" or "_" in the search box match literally.
      queryBuilder.andWhere('order.orderNumber ILIKE :search', {
        search: `%${term.replace(/[\\%_]/g, '\\$&')}%`,
      })
    }

    const sortColumn =
      ORDER_SORT_COLUMNS[query.orderField as keyof typeof ORDER_SORT_COLUMNS]

    queryBuilder.orderBy(sortColumn, query.order).addOrderBy('order.id', 'ASC')

    const [orders, total] = await queryBuilder
      .skip(query.skip)
      .take(query.take)
      .getManyAndCount()

    const orderIds = orders.map((order) => order.id)
    const [itemsByOrderId, deliveriesByOrderId] = await Promise.all([
      this.findItemsByOrderIds(orderIds),
      this.findDeliveriesByOrderIds(orderIds),
    ])

    const data = orders.map((order) =>
      this.toOrderSummary(
        order,
        itemsByOrderId.get(order.id) ?? [],
        deliveriesByOrderId.get(order.id) ?? null,
      ),
    )

    return { data, pagingMeta: new PagingMetaDto(query, total) }
  }

  private toOrderSummary(
    order: Order,
    items: OrderItem[],
    delivery: Delivery | null,
  ): OrderSummary {
    return {
      orderNumber: order.orderNumber,
      placedAt: order.placedAt,
      status: order.status,
      supplierName: order.supplierProfile.businessName,
      items: items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
      })),
      total: order.total,
      delivery: {
        streetAddress: delivery?.streetAddress ?? '',
        suburb: delivery?.suburb ?? '',
        state: delivery?.state ?? '',
        postcode: delivery?.postcode ?? '',
        // Null until the seller dispatches (seller portal not built yet).
        carrierName: delivery?.carrier?.name ?? null,
        trackingNumber: delivery?.trackingNumber ?? null,
        estimatedDeliveryAt: delivery?.estimatedDeliveryAt ?? null,
      },
    }
  }

  // Same pattern as ProductsService.findPrimaryImages — Order has no reverse
  // relation to order_item, so this page's rows are fetched in one extra query.
  private async findItemsByOrderIds(
    orderIds: string[],
  ): Promise<Map<string, OrderItem[]>> {
    if (orderIds.length === 0) {
      return new Map()
    }

    const items = await this.orderItemRepository.find({
      where: { orderId: In(orderIds) },
      order: { productName: 'ASC', id: 'ASC' },
    })

    const itemsByOrderId = new Map<string, OrderItem[]>()
    for (const item of items) {
      const existing = itemsByOrderId.get(item.orderId)
      if (existing) {
        existing.push(item)
      } else {
        itemsByOrderId.set(item.orderId, [item])
      }
    }

    return itemsByOrderId
  }

  // One delivery per order (uq_delivery_order_id) — a plain id -> row map.
  private async findDeliveriesByOrderIds(
    orderIds: string[],
  ): Promise<Map<string, Delivery>> {
    if (orderIds.length === 0) {
      return new Map()
    }

    const deliveries = await this.deliveryRepository.find({
      where: { orderId: In(orderIds) },
      relations: { carrier: true },
    })

    return new Map(deliveries.map((delivery) => [delivery.orderId, delivery]))
  }

  // GET /orders/:orderNumber — this buyer's own order only; userId comes from
  // the token (§7). Another buyer's order must look identical to a missing one.
  async getOrderDetail(
    userId: string,
    orderNumber: string,
  ): Promise<OrderDetail> {
    const order = await this.findOwnedOrder(userId, orderNumber)

    // Delivery and payment are 1:1 with the order; a missing row is a data-integrity bug.
    const [items, delivery, payment] = await Promise.all([
      this.orderItemRepository.find({
        where: { orderId: order.id },
        order: { productName: 'ASC', id: 'ASC' },
      }),
      this.deliveryRepository.findOneOrFail({
        where: { orderId: order.id },
        relations: { carrier: true },
      }),
      this.paymentRepository.findOneByOrFail({ orderId: order.id }),
    ])

    return this.toOrderDetail(order, items, delivery, payment)
  }

  // Another buyer's order looks identical to a missing one (ADR 0025).
  private async findOwnedOrder(
    userId: string,
    orderNumber: string,
  ): Promise<Order> {
    const order = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoinAndSelect('order.supplierProfile', 'supplierProfile')
      .leftJoinAndSelect('order.organisation', 'organisation')
      .where('order.orderNumber = :orderNumber', { orderNumber })
      .andWhere('order.userId = :userId', { userId })
      .getOne()

    if (!order) {
      throw new BusinessException(
        OrdersError.ORDER_NOT_FOUND.code,
        OrdersError.ORDER_NOT_FOUND.message,
      )
    }

    return order
  }

  private toOrderDetail(
    order: Order,
    items: OrderItem[],
    delivery: Delivery,
    payment: Payment,
  ): OrderDetail {
    return {
      orderNumber: order.orderNumber,
      placedAt: order.placedAt,
      status: order.status,
      cancellationReason: order.cancellationReason,
      supplierName: order.supplierProfile.businessName,
      items: items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPriceAtPurchase,
        lineTotal: item.lineTotal,
      })),
      subtotal: order.subtotal,
      gstTotal: order.gstTotal,
      total: order.total,
      delivery: {
        attentionName: delivery.attentionName,
        streetAddress: delivery.streetAddress,
        suburb: delivery.suburb,
        state: delivery.state,
        postcode: delivery.postcode,
        country: delivery.country,
        notes: delivery.notes,
        // Null until the seller dispatches (seller portal not built yet).
        carrierName: delivery.carrier?.name ?? null,
        trackingNumber: delivery.trackingNumber,
        dispatchedAt: delivery.dispatchedAt,
        estimatedDeliveryAt: delivery.estimatedDeliveryAt,
        deliveredAt: delivery.deliveredAt,
      },
      payment: {
        method: payment.method,
        status: payment.status,
        cardBrand: payment.cardBrand,
        cardLast4: payment.cardLast4,
        transactionReference: payment.transactionReference,
        paidAt: payment.paidAt,
      },
    }
  }

  // POST /orders/:orderNumber/reorder: re-adds items at current prices, not the frozen price (§4.2).
  async reorder(userId: string, orderNumber: string): Promise<ReorderResult> {
    const order = await this.findOwnedOrder(userId, orderNumber)

    const items = await this.orderItemRepository.find({
      where: { orderId: order.id },
      order: { productName: 'ASC', id: 'ASC' },
    })

    // Sequential, not Promise.all: cartService.addItem takes its own cart lock
    // per call, and each line's "add to what's there" must see the previous one.
    const lines: ReorderLineResult[] = []
    for (const item of items) {
      lines.push(await this.reorderLine(userId, item))
    }

    const cart = await this.cartService.getCart(userId)
    return { cart, lines }
  }

  // Reuses CartService.addItem as-is for visibility/stock rules — never
  // reimplemented here. A failure skips this line instead of failing the batch.
  private async reorderLine(
    userId: string,
    item: OrderItem,
  ): Promise<ReorderLineResult> {
    try {
      await this.cartService.addItem(userId, {
        productId: item.productId,
        quantity: item.quantity,
      })
      return {
        productId: item.productId,
        productName: item.productName,
        requestedQuantity: item.quantity,
        added: true,
        reason: null,
      }
    } catch (error) {
      if (!(error instanceof BusinessException)) {
        throw error
      }
      return {
        productId: item.productId,
        productName: item.productName,
        requestedQuantity: item.quantity,
        added: false,
        reason: error.message,
      }
    }
  }

  // GET /orders/:orderNumber/invoice: own orders only (ADR 0025); generation is shared with the seller app.
  async getInvoicePdf(
    userId: string,
    orderNumber: string,
  ): Promise<InvoiceDownload> {
    const order = await this.findOwnedOrder(userId, orderNumber)
    return await this.invoiceService.getInvoicePdf(order)
  }
}
