import { FulfilmentStage } from '@sa-marketplace/common'
import { PaymentMethod, PaymentStatus } from '@sa-marketplace/entities'

/** The order's payment. "Paid (mock)" is drawn from status plus method. */
export interface AdminOrderPayment {
  status: PaymentStatus
  method: PaymentMethod
}

/** One row of the All orders table. View and the order number link to the detail by `orderNumber`. */
export interface AdminOrderListItem {
  orderNumber: string
  /** The buyer's organisation, or the buyer's own name when they have none. */
  customerName: string
  supplierName: string
  placedAt: Date
  /** GST-inclusive, kept as a string (ADR 0008). */
  total: string
  /** Null if the order has no payment row. */
  payment: AdminOrderPayment | null
  fulfilment: FulfilmentStage
}

/** One line of "Items ordered". */
export interface AdminOrderLine {
  productName: string
  sku: string
  quantity: number
  /** GST-inclusive, as frozen at purchase. */
  lineTotal: string
}

/** The "Delivery & tracking" address. */
export interface AdminOrderDeliveryAddress {
  attentionName: string | null
  streetAddress: string
  suburb: string
  state: string
  postcode: string
  country: string
  notes: string | null
}

/** Dispatch fields; null until the supplier dispatches. */
export interface AdminOrderDispatch {
  carrierName: string | null
  trackingNumber: string | null
  dispatchedAt: Date | null
  estimatedDeliveryAt: Date | null
  deliveredAt: Date | null
}

/** One order's full detail, read-only. */
export interface AdminOrderDetail {
  orderNumber: string
  placedAt: Date
  customerName: string
  supplierName: string
  payment: AdminOrderPayment | null
  fulfilment: FulfilmentStage
  /** Why it was cancelled; null unless cancelled. */
  cancellationReason: string | null
  items: AdminOrderLine[]
  /** All GST-inclusive money as strings (ADR 0008). */
  subtotal: string
  gstTotal: string
  total: string
  delivery: AdminOrderDeliveryAddress
  dispatch: AdminOrderDispatch
  /** An invoice exists only once the order is dispatched or delivered. */
  canDownloadInvoice: boolean
}
