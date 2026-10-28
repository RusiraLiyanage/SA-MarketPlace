import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import {
  BusinessException,
  InvoiceDownload,
  InvoiceService,
  MailService,
  PagingMetaDto,
  TPagingResDto,
  TRANSIT_DAYS,
} from '@sa-marketplace/common'
import {
  Carrier,
  Delivery,
  Order,
  OrderItem,
  OrderStatus,
  Payment,
  PaymentStatus,
  Product,
  User,
} from '@sa-marketplace/entities'
import { DataSource, EntityManager, In, Repository } from 'typeorm'
import { SupplierContext } from '../../guards/approved-supplier.guard'
import { sumUnitsByOrderId } from './order-units'
import {
  CancelOrderDto,
  DispatchOrderDto,
  ORDER_SORT_COLUMNS,
  ListOrdersQueryDto,
} from './orders.dto'
import { OrdersError } from './orders.exception'
import {
  AWAITING_DISPATCH_STATUSES,
  CANCEL_REASON_LABELS,
  SELLER_STATUS_TO_ORDER_STATUSES,
  SellerOrderDetail,
  SellerOrderStatus,
  SellerOrderListItem,
  toSellerStatus,
} from './orders.typing'

// The signed-in seller's own orders. Every query is scoped by supplier.profileId,
// resolved from the token by ApprovedSupplierGuard, never from a URL or body (§7).
@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Delivery)
    private readonly deliveryRepository: Repository<Delivery>,
    @InjectRepository(Carrier)
    private readonly carrierRepository: Repository<Carrier>,
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
    private readonly invoiceService: InvoiceService,
  ) {}

  // GET /orders: the orders table, filtered, searched and paged.
  async listOrders(
    supplier: SupplierContext,
    query: ListOrdersQueryDto,
  ): Promise<TPagingResDto<SellerOrderListItem>> {
    // Step 1: this seller's orders, with the buyer's organisation left-joined.
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.organisation', 'organisation')
      .where('order.supplierProfileId = :profileId', {
        profileId: supplier.profileId,
      })

    // Step 2: if query.status is set, keep orders whose status is in SELLER_STATUS_TO_ORDER_STATUSES[status].
    if (query.status) {
      queryBuilder.andWhere('order.status IN (:...statuses)', {
        statuses: [...SELLER_STATUS_TO_ORDER_STATUSES[query.status]],
      })
    }

    // Step 3: if query.search is set, match the order number case-insensitively, escaping LIKE wildcards.
    const term = query.search?.trim()
    if (term) {
      const search = `%${term.replace(/[\\%_]/g, '\\$&')}%`
      queryBuilder.andWhere('order.orderNumber ILIKE :search', { search })
    }

    // Step 4: sort by the allow-listed column, order.id as tie-break, and page with getManyAndCount().
    const sortColumn =
      ORDER_SORT_COLUMNS[query.orderField as keyof typeof ORDER_SORT_COLUMNS]

    const [orders, total] = await queryBuilder
      .orderBy(sortColumn, query.order)
      .addOrderBy('order.id', 'ASC')
      .skip(query.skip)
      .take(query.take)
      .getManyAndCount()

    // Step 5: itemCount per order: one grouped query summing order_item.quantity for the page.
    const unitsByOrderId = await sumUnitsByOrderId(
      this.orderItemRepository,
      orders.map((order) => order.id),
    )

    // Step 6: map each order: status via toSellerStatus, canDownloadInvoice once dispatched or delivered.
    const data = orders.map(
      (order): SellerOrderListItem => ({
        orderNumber: order.orderNumber,
        organisationName: order.organisation?.name ?? null,
        placedAt: order.placedAt,
        itemCount: unitsByOrderId.get(order.id) ?? 0,
        total: order.total,
        status: toSellerStatus(order.status),
        canDownloadInvoice:
          order.status === OrderStatus.dispatched ||
          order.status === OrderStatus.delivered,
      }),
    )

    // Step 7: return { data, pagingMeta: new PagingMetaDto(query, total) }.
    return { data, pagingMeta: new PagingMetaDto(query, total) }
  }

  // GET /orders/:orderNumber: the order detail page.
  async getOrderDetail(
    supplier: SupplierContext,
    orderNumber: string,
  ): Promise<SellerOrderDetail> {
    // Step 1: find the order by number among THIS seller's orders (organisation left-joined); none is ECB404 ORDER_NOT_FOUND.
    const order = await this.findOwnOrder(supplier, orderNumber)

    // Step 2: load its lines (productName, sku, quantity) ordered by product name, and its delivery with the carrier.
    const [items, delivery] = await Promise.all([
      this.orderItemRepository.find({
        where: { orderId: order.id },
        order: { productName: 'ASC', id: 'ASC' },
      }),
      this.deliveryRepository.findOneOrFail({
        where: { orderId: order.id },
        relations: { carrier: true },
      }),
    ])

    // Step 3: map to SellerOrderDetail: status via toSellerStatus, address, dispatch fields plus supplier.defaultCarrier.
    const status = toSellerStatus(order.status)
    // A carrier can be pre-assigned, but is only shown once the order has gone out.
    const hasDispatched =
      status === SellerOrderStatus.dispatched ||
      status === SellerOrderStatus.delivered
    const detail = {
      orderNumber: order.orderNumber,
      placedAt: order.placedAt,
      status,
      cancellationReason: order.cancellationReason,
      organisationName: order.organisation?.name ?? null,
      items: items.map((item) => ({
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
      })),
      delivery: {
        attentionName: delivery.attentionName,
        streetAddress: delivery.streetAddress,
        suburb: delivery.suburb,
        state: delivery.state,
        postcode: delivery.postcode,
        country: delivery.country,
        notes: delivery.notes,
      },
      dispatch: {
        carrierName: hasDispatched ? delivery.carrier?.name ?? null : null,
        trackingNumber: hasDispatched ? delivery.trackingNumber : null,
        dispatchedAt: delivery.dispatchedAt,
        estimatedDeliveryAt: delivery.estimatedDeliveryAt,
        deliveredAt: delivery.deliveredAt,
        defaultCarrier: supplier.defaultCarrier,
      },
    }

    // Step 4: canDispatch while new or picking; canDownloadInvoice once dispatched or delivered.
    return {
      ...detail,
      canDispatch:
        status === SellerOrderStatus.new ||
        status === SellerOrderStatus.picking,
      canDownloadInvoice: hasDispatched,
    }
  }

  // POST /orders/:orderNumber/dispatch: record the dispatch and move the order on.
  async dispatchOrder(
    supplier: SupplierContext,
    orderNumber: string,
    dto: DispatchOrderDto,
  ): Promise<SellerOrderDetail> {
    // Step 1: find the order among THIS seller's orders; none is ECB404 ORDER_NOT_FOUND.
    const order = await this.findOwnOrder(supplier, orderNumber)

    // Step 2: it must be new or picking; anything else is ECB409 CANNOT_FULFIL.
    const status = toSellerStatus(order.status)
    if (
      status !== SellerOrderStatus.new &&
      status !== SellerOrderStatus.picking
    ) {
      throw this.cannotFulfil()
    }

    // Step 3: dispatchedAt is now; estimatedDeliveryAt is dispatchedAt + TRANSIT_DAYS, as at checkout.
    const dispatchedAt = new Date()
    const estimatedDeliveryAt = new Date(
      dispatchedAt.getTime() + TRANSIT_DAYS * 24 * 60 * 60 * 1000,
    )

    // Step 4: normalise the carrier name and look it up, ignoring case.
    const carrierName = dto.carrierName.trim().replace(/\s+/g, ' ')
    const existingCarrier = await this.findCarrier(
      this.carrierRepository.manager,
      carrierName,
    )

    // Step 5: in one transaction: create the carrier if new, set status dispatched only if still new or picking (else ECB409), then the delivery's carrier, tracking and times.
    await this.dataSource.transaction(async (manager) => {
      const carrier =
        existingCarrier ?? (await this.createCarrier(manager, carrierName))

      // The status in the condition is the real guard: two quick dispatches, or one
      // racing a cancellation, cannot both win.
      const moved = await manager.update(
        Order,
        { id: order.id, status: In([...AWAITING_DISPATCH_STATUSES]) },
        { status: OrderStatus.dispatched },
      )
      if (moved.affected !== 1) {
        throw this.cannotFulfil()
      }

      await manager.update(
        Delivery,
        { orderId: order.id },
        {
          carrierId: carrier.id,
          trackingNumber: dto.trackingNumber.trim(),
          dispatchedAt,
          estimatedDeliveryAt,
        },
      )
    })

    // Step 6: return the refreshed detail via getOrderDetail.
    return await this.getOrderDetail(supplier, orderNumber)
  }

  // POST /orders/:orderNumber/cancel: cancel an order the seller cannot fulfil.
  async cancelOrder(
    supplier: SupplierContext,
    orderNumber: string,
    dto: CancelOrderDto,
  ): Promise<SellerOrderDetail> {
    // Step 1: find the order among THIS seller's orders; none is ECB404 ORDER_NOT_FOUND.
    const order = await this.findOwnOrder(supplier, orderNumber)

    // Step 2: it must be new or picking; anything else is ECB409 ORDER_NOT_CANCELLABLE.
    const status = toSellerStatus(order.status)
    if (
      status !== SellerOrderStatus.new &&
      status !== SellerOrderStatus.picking
    ) {
      throw this.notCancellable()
    }

    // Step 3: the stored reason is the label for dto.reason, plus ": notes" when notes are given.
    const label = CANCEL_REASON_LABELS[dto.reason]
    const notes = dto.notes?.trim()
    const reason = notes ? `${label}: ${notes}` : label

    await this.dataSource.transaction(async (manager) => {
      // Step 4: in one transaction: set status cancelled and the reason, only if still new or picking (else ECB409).
      const cancelled = await manager.update(
        Order,
        { id: order.id, status: In([...AWAITING_DISPATCH_STATUSES]) },
        { status: OrderStatus.cancelled, cancellationReason: reason },
      )
      if (cancelled.affected !== 1) {
        throw this.notCancellable()
      }

      // Step 5: in the same transaction, give each line's units back to product.quantity (the reverse of checkout's reserveStock).
      const lines = await manager.find(OrderItem, {
        where: { orderId: order.id },
      })
      for (const line of lines) {
        await manager.increment(
          Product,
          { id: line.productId },
          'quantity',
          line.quantity,
        )
      }

      // Step 6: in the same transaction, mark a paid payment refunded; pending or failed ones are left alone.
      await manager.update(
        Payment,
        { orderId: order.id, status: PaymentStatus.paid },
        { status: PaymentStatus.refunded },
      )
    })

    // Step 7: after commit, email the buyer that the order was cancelled and why (mock mail).
    const buyer = await this.dataSource
      .getRepository(User)
      .findOneBy({ id: order.userId })
    if (buyer) {
      this.mailService.send({
        to: buyer.email,
        subject: `Order ${order.orderNumber} was cancelled`,
        text:
          `Hi ${buyer.firstName},\n\n` +
          `${supplier.businessName} has cancelled order ${order.orderNumber}.\n` +
          `Reason: ${reason}\n\n` +
          `Any payment you made will be refunded in full.`,
      })
    }

    // Step 8: return the refreshed detail via getOrderDetail.
    return await this.getOrderDetail(supplier, orderNumber)
  }

  // GET /orders/:orderNumber/invoice: the same stored PDF the buyer downloads (ADR 0036).
  async getInvoicePdf(
    supplier: SupplierContext,
    orderNumber: string,
  ): Promise<InvoiceDownload> {
    // Step 1: find the order among THIS seller's orders; none is ECB404 ORDER_NOT_FOUND.
    const order = await this.findOwnOrder(supplier, orderNumber)

    // Step 2: the shared service gates on dispatched or delivered (else ECB409), then serves or generates the PDF.
    return await this.invoiceService.getInvoicePdf(order)
  }

  // Scoped by supplier: another seller's order looks identical to a missing one (ADR 0025).
  private async findOwnOrder(
    supplier: SupplierContext,
    orderNumber: string,
  ): Promise<Order> {
    const order = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoinAndSelect('order.supplierProfile', 'supplierProfile')
      .leftJoinAndSelect('order.organisation', 'organisation')
      .where('order.orderNumber = :orderNumber', { orderNumber })
      .andWhere('order.supplierProfileId = :profileId', {
        profileId: supplier.profileId,
      })
      .getOne()

    if (!order) {
      throw new BusinessException(
        OrdersError.ORDER_NOT_FOUND.code,
        OrdersError.ORDER_NOT_FOUND.message,
      )
    }

    return order
  }

  private notCancellable(): BusinessException {
    return new BusinessException(
      OrdersError.ORDER_NOT_CANCELLABLE.code,
      OrdersError.ORDER_NOT_CANCELLABLE.message,
    )
  }

  private cannotFulfil(): BusinessException {
    return new BusinessException(
      OrdersError.CANNOT_FULFIL.code,
      OrdersError.CANNOT_FULFIL.message,
    )
  }

  private findCarrier(
    manager: EntityManager,
    name: string,
  ): Promise<Carrier | null> {
    return manager
      .createQueryBuilder(Carrier, 'carrier')
      .where('LOWER(carrier.name) = LOWER(:name)', { name })
      .getOne()
  }

  // orIgnore: if another request created the same name a moment ago, use theirs.
  private async createCarrier(
    manager: EntityManager,
    name: string,
  ): Promise<Carrier> {
    await manager
      .createQueryBuilder()
      .insert()
      .into(Carrier)
      .values({ name })
      .orIgnore()
      .execute()

    const carrier = await this.findCarrier(manager, name)
    if (!carrier) {
      throw new Error(`Carrier "${name}" was not created`)
    }
    return carrier
  }
}
