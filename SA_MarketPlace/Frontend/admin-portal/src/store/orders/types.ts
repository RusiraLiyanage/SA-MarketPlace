export const PaymentStatus = { pending: 'pending', paid: 'paid', failed: 'failed', refunded: 'refunded' } as const
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus]

export const PaymentMethod = { cardMock: 'card_mock', invoiceOnAccount: 'invoice_on_account' } as const
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod]

/** Where an order is in the supplier's hands. One stage per order, however the backend's own statuses are split. */
export const FulfilmentStage = { received: 'received', picking: 'picking', dispatched: 'dispatched', delivered: 'delivered', cancelled: 'cancelled' } as const
export type FulfilmentStage = (typeof FulfilmentStage)[keyof typeof FulfilmentStage]

/** The order's payment. "Paid (mock)" is drawn from the status and the method. */
export interface OrderPayment {
  status: PaymentStatus
  method: PaymentMethod
}

/** One row of the All orders table. The order number and View open the detail by `orderNumber`. */
export interface AdminOrderListItem {
  orderNumber: string
  /** The buyer's organisation, or the buyer's own name when they have none. */
  customerName: string
  supplierName: string
  placedAt: string
  /** GST-inclusive, kept as a string like the backend. */
  total: string
  /** Null if the order has no payment row. */
  payment: OrderPayment | null
  fulfilment: FulfilmentStage
}

export type OrderSortField = 'placed_at' | 'total' | 'order_number'

/** What the table and its export share: the filters and the sort. */
export interface OrdersFilter {
  /** Left out for All. */
  payment?: PaymentStatus
  fulfilment?: FulfilmentStage
  /** Part of the order number, or of the customer's name. */
  search?: string
  orderField?: OrderSortField
  order?: 'ASC' | 'DESC'
}

export interface ListOrdersRequest extends OrdersFilter {
  page: number
  limit: number
}

/** One line of "Items ordered". */
export interface AdminOrderLine {
  productName: string
  sku: string
  quantity: number
  /** GST-inclusive, as frozen at purchase. */
  lineTotal: string
}

/** Where the order goes. */
export interface AdminOrderDelivery {
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
  dispatchedAt: string | null
  estimatedDeliveryAt: string | null
  deliveredAt: string | null
}

/** One order's full detail, read-only. */
export interface AdminOrderDetail {
  orderNumber: string
  placedAt: string
  customerName: string
  supplierName: string
  payment: OrderPayment | null
  fulfilment: FulfilmentStage
  /** Why it was cancelled; null unless cancelled. */
  cancellationReason: string | null
  items: AdminOrderLine[]
  /** All money is GST-inclusive and kept as a string like the backend. */
  subtotal: string
  gstTotal: string
  total: string
  delivery: AdminOrderDelivery
  dispatch: AdminOrderDispatch
  /** An invoice exists only once the order is dispatched or delivered. */
  canDownloadInvoice: boolean
}
