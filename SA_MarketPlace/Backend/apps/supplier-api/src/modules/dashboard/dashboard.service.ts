import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { PagingMetaDto, TPagingResDto } from '@sa-marketplace/common'
import {
  Delivery,
  ListingStatus,
  Order,
  OrderItem,
  Product,
} from '@sa-marketplace/entities'
import { In, Repository } from 'typeorm'
import { SupplierContext } from '../../guards/approved-supplier.guard'
import {
  DISPATCH_QUEUE_SORT_COLUMNS,
  ListDispatchQueueQueryDto,
} from './dashboard.dto'
import {
  AWAITING_DISPATCH_STATUSES,
  NEW_ORDER_STATUSES,
} from '../orders/orders.typing'
import { sumUnitsByOrderId } from '../orders/order-units'
import { DispatchQueueItem, SupplierOverview } from './dashboard.typing'

const MS_PER_HOUR = 3_600_000

// Start of today/tomorrow in :zone as UTC instants. Computed from now(), never the column,
// so an index on dispatched_at can still be used.
const DAY_START = `(date_trunc('day', now() AT TIME ZONE :zone) AT TIME ZONE :zone)`
const DAY_END = `((date_trunc('day', now() AT TIME ZONE :zone) + interval '1 day') AT TIME ZONE :zone)`

// The seller's own dashboard; every query is scoped by supplier.profileId from the guard (§7).
@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Delivery)
    private readonly deliveryRepository: Repository<Delivery>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  // GET /dashboard/overview — the three cards and the Catalogue badge.
  async getOverview(supplier: SupplierContext): Promise<SupplierOverview> {
    // Step 1: businessName comes from `supplier` (the guard already loaded
    //   the profile) — no query.
    const { businessName } = supplier

    // Step 2: newOrders — count this seller's orders whose status is in
    //   NEW_ORDER_STATUSES.
    const countNewOrders = this.orderRepository.count({
      where: {
        supplierProfileId: supplier.profileId,
        status: In([...NEW_ORDER_STATUSES]),
      },
    })

    // Step 3: dispatchedToday: orders dispatched today in this seller's timezone (ADR 0033).
    const countDispatchedToday = this.deliveryRepository
      .createQueryBuilder('delivery')
      .innerJoin('delivery.order', 'order')
      .where('order.supplierProfileId = :profileId', {
        profileId: supplier.profileId,
      })
      .andWhere(
        `delivery.dispatchedAt >= ${DAY_START} AND delivery.dispatchedAt < ${DAY_END}`,
        { zone: supplier.timezone },
      )
      .getCount()

    // Step 4: one aggregate query: published listings, and those at or below their low-stock threshold.
    const countListings = this.productRepository
      .createQueryBuilder('product')
      .select('COUNT(*)', 'active')
      .addSelect(
        'COUNT(*) FILTER (WHERE product.quantity <= product.lowStockThreshold)',
        'needingAttention',
      )
      .where('product.supplierProfileId = :profileId', {
        profileId: supplier.profileId,
      })
      .andWhere('product.listingStatus = :published', {
        published: ListingStatus.published,
      })
      .getRawOne<{ active: string; needingAttention: string }>()

    // Step 5: run steps 2–4 in parallel and return the overview; all zeros is valid (empty state).
    const [newOrders, dispatchedToday, listings] = await Promise.all([
      countNewOrders,
      countDispatchedToday,
      countListings,
    ])

    return {
      businessName,
      newOrders,
      dispatchedToday,
      activeListings: Number(listings?.active ?? 0),
      listingsNeedingAttention: Number(listings?.needingAttention ?? 0),
    }
  }

  // GET /dashboard/orders-requiring-dispatch — the table, paged.
  async getOrdersRequiringDispatch(
    supplier: SupplierContext,
    query: ListDispatchQueueQueryDto,
  ): Promise<TPagingResDto<DispatchQueueItem>> {
    // Step 1: this seller's orders awaiting dispatch, with the buyer's organisation left-joined.
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.organisation', 'organisation')
      .where('order.supplierProfileId = :profileId', {
        profileId: supplier.profileId,
      })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [...AWAITING_DISPATCH_STATUSES],
      })

    // Step 2: sort by the allow-listed column, order.id as tie-break, and page like My Orders.
    const sortColumn =
      DISPATCH_QUEUE_SORT_COLUMNS[
        query.orderField as keyof typeof DISPATCH_QUEUE_SORT_COLUMNS
      ]

    queryBuilder.orderBy(sortColumn, query.order).addOrderBy('order.id', 'ASC')

    const [orders, total] = await queryBuilder
      .skip(query.skip)
      .take(query.take)
      .getManyAndCount()

    // Step 3: itemCount per order — ONE grouped query summing
    //   order_item.quantity for the page's order ids (never a query per row).
    const unitsByOrderId = await sumUnitsByOrderId(
      this.orderItemRepository,
      orders.map((order) => order.id),
    )

    // Step 4: slaDueAt = placedAt + dispatchSlaHours; slaHoursLeft is rounded up, negative once overdue.
    const now = Date.now()
    const data = orders.map((order): DispatchQueueItem => {
      const slaDueAt = new Date(
        order.placedAt.getTime() + supplier.dispatchSlaHours * MS_PER_HOUR,
      )
      return {
        orderNumber: order.orderNumber,
        organisationName: order.organisation?.name ?? null,
        placedAt: order.placedAt,
        itemCount: unitsByOrderId.get(order.id) ?? 0,
        slaDueAt,
        slaHoursLeft: Math.ceil((slaDueAt.getTime() - now) / MS_PER_HOUR),
      }
    })

    // Step 5: return { data, pagingMeta: new PagingMetaDto(query, total) }.
    return { data, pagingMeta: new PagingMetaDto(query, total) }
  }
}
