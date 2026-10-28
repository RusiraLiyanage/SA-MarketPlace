export const SellerOrderStatus = {
  new: 'new',
  picking: 'picking',
  dispatched: 'dispatched',
  delivered: 'delivered',
  cancelled: 'cancelled',
} as const
export type SellerOrderStatus = (typeof SellerOrderStatus)[keyof typeof SellerOrderStatus]

/** One row of the orders table. */
export interface OrderListItem {
  orderNumber: string
  /** The buyer's organisation; null if the buyer has none. */
  organisationName: string | null
  placedAt: string
  /** Units across the order's lines. */
  itemCount: number
  /** GST-inclusive, kept as a string like the backend. */
  total: string
  status: SellerOrderStatus
  /** An invoice exists only once the order is dispatched or delivered. */
  canDownloadInvoice: boolean
}

/** One line of the pick list. */
export interface OrderLine {
  productName: string
  sku: string
  quantity: number
}

export interface DeliveryAddress {
  attentionName: string | null
  streetAddress: string
  suburb: string
  state: string
  postcode: string
  country: string
  notes: string | null
}

/** Null until the seller dispatches; a carrier and tracking number are hidden until then. */
export interface DispatchDetails {
  carrierName: string | null
  trackingNumber: string | null
  dispatchedAt: string | null
  estimatedDeliveryAt: string | null
  deliveredAt: string | null
  /** This seller's default carrier, to prefill the dispatch form. */
  defaultCarrier: string | null
}

export interface OrderDetail {
  orderNumber: string
  placedAt: string
  status: SellerOrderStatus
  /** Why it was cancelled; null unless cancelled. */
  cancellationReason: string | null
  organisationName: string | null
  items: OrderLine[]
  delivery: DeliveryAddress
  dispatch: DispatchDetails
  /** True while the order still awaits dispatch (new or picking). */
  canDispatch: boolean
  canDownloadInvoice: boolean
}

export interface ListOrdersRequest {
  page: number
  limit: number
  /** Left out for All. */
  status?: SellerOrderStatus
  /** Part of the order number. */
  search?: string
}

/** The backend sets the dispatch and estimated delivery times itself; sending either is a 400. */
export interface DispatchRequest {
  orderNumber: string
  carrierName: string
  trackingNumber: string
}

export type CancelReason = 'out_of_stock' | 'cannot_meet_sla' | 'pricing_error' | 'other'

export interface CancelRequest {
  orderNumber: string
  reason: CancelReason
  /** Required when the reason is "other"; at most 500 characters. */
  notes?: string
}
