import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import {
  BusinessException,
  CSV_BOM,
  FULFILMENT_STAGE_ORDER_STATUSES,
  FulfilmentStage,
  InvoiceDownload,
  InvoiceService,
  joinContactName,
  PagingMetaDto,
  toCsvRow,
  toFulfilmentStage,
  TPagingResDto,
} from '@sa-marketplace/common'
import { Delivery, Order, OrderItem, Payment } from '@sa-marketplace/entities'
import { Readable } from 'stream'
import { In, Repository, SelectQueryBuilder } from 'typeorm'
import {
  DEFAULT_EXPORT_MAX_ROWS,
  EXPORT_BATCH_SIZE,
  EXPORT_COLUMNS,
} from './orders.constant'
import {
  ExportOrdersQueryDto,
  ListOrdersQueryDto,
  ORDER_SORT_COLUMNS,
} from './orders.dto'
import { OrdersError } from './orders.exception'
import {
  AdminOrderDetail,
  AdminOrderListItem,
  AdminOrderPayment,
} from './orders.typing'

// Every order on the platform, read-only, for Sample Assist staff. Admin routes are not scoped to one
// supplier or buyer: the role guard on the controller is the boundary (§7).
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
    private readonly invoiceService: InvoiceService,
    private readonly configService: ConfigService,
  ) {}

  private readonly logger = new Logger(OrdersService.name)

  // GET /orders: the All orders table, filtered, searched and paged.
  async listOrders(
    query: ListOrdersQueryDto,
  ): Promise<TPagingResDto<AdminOrderListItem>> {
    // Step 1: every order matching the filters (payment, fulfilment, search), with the buyer's organisation, the buyer, the supplier and the payment left-joined.
    // Step 2: sort by the allow-listed column, order.id as tie-break, and page with getManyAndCount().
    const [orders, total] = await this.sorted(this.filteredOrders(query), query)
      .skip(query.skip)
      .take(query.take)
      .getManyAndCount()

    // Step 3: map each order: customerName is the organisation's name, else the buyer's first and last name joined; fulfilment via toFulfilmentStage.
    const payments = await this.paymentsByOrderId(
      orders.map((order) => order.id),
    )
    const data = orders.map((order) => this.toListItem(order, payments))

    // Step 4: return { data, pagingMeta: new PagingMetaDto(query, total) }.
    return { data, pagingMeta: new PagingMetaDto(query, total) }
  }

  // GET /orders/export: the table's rows as a CSV, streamed. Same filters and sort as listOrders, no paging.
  async exportOrders(
    adminUserId: string,
    query: ExportOrdersQueryDto,
  ): Promise<{ filename: string; stream: Readable }> {
    // Step 1: the matching orders as at now. A cut-off on placed_at keeps the batches stable: an order
    //   placed while the file is being written is left out, so no row shifts, repeats or goes missing.
    const cutoff = new Date()
    const filtered = this.filteredOrders(query).andWhere(
      'order.placedAt <= :cutoff',
      { cutoff },
    )

    // Step 2: count them first; over the cap is ECB001 EXPORT_TOO_LARGE, before any byte is sent.
    const total = await filtered.getCount()
    if (total > this.maxExportRows()) {
      throw new BusinessException(
        OrdersError.EXPORT_TOO_LARGE.code,
        OrdersError.EXPORT_TOO_LARGE.message,
      )
    }

    // Step 3: stream it: the header, then the rows in batches read as the client takes them, so memory
    //   stays flat and nothing is written to disk. The caller destroys the stream if the client leaves.
    const stream = Readable.from(this.csvChunks(this.sorted(filtered, query)), {
      objectMode: false,
    })

    // Step 4: log who exported how many rows (no filters or names), then name the file by its UTC date.
    this.logger.log(`Order export by admin ${adminUserId}: ${total} rows`)
    return {
      filename: `orders-${cutoff.toISOString().slice(0, 10)}.csv`,
      stream,
    }
  }

  // GET /orders/:orderNumber: the order detail page.
  async getOrderDetail(orderNumber: string): Promise<AdminOrderDetail> {
    // Step 1: find the order by number (organisation, buyer and supplier loaded); none is ECB404 OrdersError.ORDER_NOT_FOUND.
    const order = await this.findOrder(orderNumber)

    // Step 2: load its lines ordered by product name then id, its delivery with the carrier, and its payment.
    const [items, delivery, payments] = await Promise.all([
      this.orderItemRepository.find({
        where: { orderId: order.id },
        order: { productName: 'ASC', id: 'ASC' },
      }),
      this.deliveryRepository.findOneOrFail({
        where: { orderId: order.id },
        relations: { carrier: true },
      }),
      this.paymentsByOrderId([order.id]),
    ])

    // Step 3: map: customerName and fulfilment as in the list; the carrier name and tracking number only once dispatched.
    const fulfilment = toFulfilmentStage(order.status)
    // A carrier can be pre-assigned, but is only shown once the order has gone out.
    const hasDispatched =
      fulfilment === FulfilmentStage.dispatched ||
      fulfilment === FulfilmentStage.delivered

    // Step 4: canDownloadInvoice once the order is dispatched or delivered.
    return {
      orderNumber: order.orderNumber,
      placedAt: order.placedAt,
      customerName: this.customerName(order),
      supplierName: order.supplierProfile.businessName,
      payment: payments.get(order.id) ?? null,
      fulfilment,
      cancellationReason: order.cancellationReason,
      items: items.map((item) => ({
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
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
      },
      dispatch: {
        carrierName: hasDispatched ? delivery.carrier?.name ?? null : null,
        trackingNumber: hasDispatched ? delivery.trackingNumber : null,
        dispatchedAt: delivery.dispatchedAt,
        estimatedDeliveryAt: delivery.estimatedDeliveryAt,
        deliveredAt: delivery.deliveredAt,
      },
      canDownloadInvoice: hasDispatched,
    }
  }

  // GET /orders/:orderNumber/invoice: the same stored PDF the buyer and the seller download (ADR 0036).
  async getInvoicePdf(orderNumber: string): Promise<InvoiceDownload> {
    // Step 1: find the order with its supplier profile and organisation loaded; none is ECB404 ORDER_NOT_FOUND.
    const order = await this.findOrder(orderNumber)

    // Step 2: the shared service gates on dispatched or delivered (else ECB409), then serves or generates the PDF.
    return await this.invoiceService.getInvoicePdf(order)
  }

  // The filters the table and the export share. Search is wildcard-escaped; payment is a join, not a relation.
  private filteredOrders(
    query: ExportOrdersQueryDto,
  ): SelectQueryBuilder<Order> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.organisation', 'organisation')
      .innerJoinAndSelect('order.user', 'user')
      .innerJoinAndSelect('order.supplierProfile', 'supplierProfile')
      .leftJoin(Payment, 'payment', 'payment.orderId = order.id')

    if (query.payment) {
      queryBuilder.andWhere('payment.status = :payment', {
        payment: query.payment,
      })
    }

    if (query.fulfilment) {
      queryBuilder.andWhere('order.status IN (:...statuses)', {
        statuses: [...FULFILMENT_STAGE_ORDER_STATUSES[query.fulfilment]],
      })
    }

    const term = query.search?.trim()
    if (term) {
      const search = `%${term.replace(/[\\%_]/g, '\\$&')}%`
      queryBuilder.andWhere(
        `(order.orderNumber ILIKE :search
          OR organisation.name ILIKE :search
          OR (user.firstName || ' ' || user.lastName) ILIKE :search)`,
        { search },
      )
    }

    return queryBuilder
  }

  // The allow-listed sort column, with order.id as the tie-break so pages and batches never overlap.
  private sorted(
    queryBuilder: SelectQueryBuilder<Order>,
    query: ExportOrdersQueryDto,
  ): SelectQueryBuilder<Order> {
    const sortColumn =
      ORDER_SORT_COLUMNS[query.orderField as keyof typeof ORDER_SORT_COLUMNS]
    return queryBuilder
      .orderBy(sortColumn, query.order)
      .addOrderBy('order.id', 'ASC')
  }

  private toListItem(
    order: Order,
    payments: Map<string, AdminOrderPayment>,
  ): AdminOrderListItem {
    return {
      orderNumber: order.orderNumber,
      customerName: this.customerName(order),
      supplierName: order.supplierProfile.businessName,
      placedAt: order.placedAt,
      total: order.total,
      payment: payments.get(order.id) ?? null,
      fulfilment: toFulfilmentStage(order.status),
    }
  }

  // The file's text, a piece at a time: the BOM and header, then one batch of rows per database read.
  private async *csvChunks(
    queryBuilder: SelectQueryBuilder<Order>,
  ): AsyncGenerator<string> {
    yield CSV_BOM + toCsvRow(EXPORT_COLUMNS)

    for (let skip = 0; ; skip += EXPORT_BATCH_SIZE) {
      const orders = await queryBuilder
        .clone()
        .skip(skip)
        .take(EXPORT_BATCH_SIZE)
        .getMany()
      const payments = await this.paymentsByOrderId(
        orders.map((order) => order.id),
      )

      yield orders
        .map((order) => this.toListItem(order, payments))
        .map((item) =>
          toCsvRow([
            item.orderNumber,
            item.customerName,
            item.supplierName,
            item.placedAt,
            item.total,
            item.payment?.status,
            item.payment?.method,
            item.fulfilment,
          ]),
        )
        .join('')

      if (orders.length < EXPORT_BATCH_SIZE) {
        return
      }
    }
  }

  private maxExportRows(): number {
    return (
      Number(this.configService.get('ORDER_EXPORT_MAX_ROWS')) ||
      DEFAULT_EXPORT_MAX_ROWS
    )
  }

  private async findOrder(orderNumber: string): Promise<Order> {
    const order = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoinAndSelect('order.supplierProfile', 'supplierProfile')
      .innerJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.organisation', 'organisation')
      .where('order.orderNumber = :orderNumber', { orderNumber })
      .getOne()

    if (!order) {
      throw new BusinessException(
        OrdersError.ORDER_NOT_FOUND.code,
        OrdersError.ORDER_NOT_FOUND.message,
      )
    }

    return order
  }

  // The organisation is the customer; a buyer with none is shown by their own name.
  private customerName(order: Order): string {
    return (
      order.organisation?.name ??
      joinContactName(order.user.firstName, order.user.lastName)
    )
  }

  private async paymentsByOrderId(
    orderIds: string[],
  ): Promise<Map<string, AdminOrderPayment>> {
    if (orderIds.length === 0) {
      return new Map()
    }
    const payments = await this.paymentRepository.find({
      where: { orderId: In(orderIds) },
    })
    return new Map(
      payments.map((payment) => [
        payment.orderId,
        { status: payment.status, method: payment.method },
      ]),
    )
  }
}
