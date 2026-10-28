import {
  FULFILMENT_STAGE_ORDER_STATUSES,
  FulfilmentStage,
  toFulfilmentStage,
} from '@sa-marketplace/common'
import { OrderStatus } from '@sa-marketplace/entities'

/** The seller's status vocabulary; the backend keeps a single OrderStatus (CLAUDE.md §9.2). */
export enum SellerOrderStatus {
  new = 'new',
  picking = 'picking',
  dispatched = 'dispatched',
  delivered = 'delivered',
  cancelled = 'cancelled',
}

// Which backend statuses each seller status covers. The one definition shared by
// the dashboard and the orders list, so they can never disagree. Built from the
// fulfilment stages the admin app uses too: the seller's "new" is the admin's "received".
export const SELLER_STATUS_TO_ORDER_STATUSES: Record<
  SellerOrderStatus,
  readonly OrderStatus[]
> = {
  [SellerOrderStatus.new]:
    FULFILMENT_STAGE_ORDER_STATUSES[FulfilmentStage.received],
  [SellerOrderStatus.picking]:
    FULFILMENT_STAGE_ORDER_STATUSES[FulfilmentStage.picking],
  [SellerOrderStatus.dispatched]:
    FULFILMENT_STAGE_ORDER_STATUSES[FulfilmentStage.dispatched],
  [SellerOrderStatus.delivered]:
    FULFILMENT_STAGE_ORDER_STATUSES[FulfilmentStage.delivered],
  [SellerOrderStatus.cancelled]:
    FULFILMENT_STAGE_ORDER_STATUSES[FulfilmentStage.cancelled],
}

export const NEW_ORDER_STATUSES =
  SELLER_STATUS_TO_ORDER_STATUSES[SellerOrderStatus.new]

export const AWAITING_DISPATCH_STATUSES = [
  ...SELLER_STATUS_TO_ORDER_STATUSES[SellerOrderStatus.new],
  ...SELLER_STATUS_TO_ORDER_STATUSES[SellerOrderStatus.picking],
] as const

const STAGE_TO_SELLER_STATUS: Record<FulfilmentStage, SellerOrderStatus> = {
  [FulfilmentStage.received]: SellerOrderStatus.new,
  [FulfilmentStage.picking]: SellerOrderStatus.picking,
  [FulfilmentStage.dispatched]: SellerOrderStatus.dispatched,
  [FulfilmentStage.delivered]: SellerOrderStatus.delivered,
  [FulfilmentStage.cancelled]: SellerOrderStatus.cancelled,
}

export const toSellerStatus = (status: OrderStatus): SellerOrderStatus =>
  STAGE_TO_SELLER_STATUS[toFulfilmentStage(status)]

/** One row of the seller's orders table. View details and Download invoice are links built from orderNumber. */
export interface SellerOrderListItem {
  orderNumber: string
  /** The buyer's organisation; null if the buyer has none. */
  organisationName: string | null
  placedAt: Date
  /** Total units across the order's lines. */
  itemCount: number
  /** GST-inclusive, kept as a string (ADR 0008). */
  total: string
  status: SellerOrderStatus
  /** An invoice exists only once the order is dispatched or delivered. */
  canDownloadInvoice: boolean
}

/** One line of the pick list. */
export interface SellerOrderLine {
  productName: string
  sku: string
  quantity: number
}

/** Where to deliver. */
export interface OrderDeliveryAddress {
  attentionName: string | null
  streetAddress: string
  suburb: string
  state: string
  postcode: string
  country: string
  notes: string | null
}

/** Dispatch fields; null until the seller dispatches. */
export interface OrderDispatchDetails {
  carrierName: string | null
  trackingNumber: string | null
  dispatchedAt: Date | null
  estimatedDeliveryAt: Date | null
  deliveredAt: Date | null
  /** This seller's default carrier, to prefill the dispatch form. */
  defaultCarrier: string | null
}

/** One order's full detail for the seller: summary, pick list and dispatch details. */
export interface SellerOrderDetail {
  orderNumber: string
  placedAt: Date
  /** Drives the fulfilment progress: new = Received, then picking, dispatched, delivered. */
  status: SellerOrderStatus
  /** Why it was cancelled; null unless cancelled. */
  cancellationReason: string | null
  /** The buyer's organisation; null if the buyer has none. */
  organisationName: string | null
  items: SellerOrderLine[]
  delivery: OrderDeliveryAddress
  dispatch: OrderDispatchDetails
  /** True while the order still awaits dispatch (new or picking). */
  canDispatch: boolean
  /** An invoice exists only once the order is dispatched or delivered. */
  canDownloadInvoice: boolean
}

/** Why a seller cancels an order they cannot fulfil (CLAUDE.md open question 6). */
export enum CancelReason {
  outOfStock = 'out_of_stock',
  cannotMeetSla = 'cannot_meet_sla',
  pricingError = 'pricing_error',
  other = 'other',
}

// The text stored as order.cancellationReason and shown to the buyer.
export const CANCEL_REASON_LABELS: Record<CancelReason, string> = {
  [CancelReason.outOfStock]: 'Out of stock',
  [CancelReason.cannotMeetSla]: 'Cannot meet dispatch SLA',
  [CancelReason.pricingError]: 'Pricing error',
  [CancelReason.other]: 'Other',
}
