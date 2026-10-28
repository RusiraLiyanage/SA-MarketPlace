import { OrderStatus } from '@sa-marketplace/entities'
import { DeliveryView, PaymentView } from '../checkout/checkout.typing'
import { CartView } from '../cart/cart.typing'

/** One item as shown in the My Orders list — a summary, not the priced line. */
export interface OrderSummaryItem {
  productName: string
  quantity: number
}

/** Carrier fields are null until the seller dispatches (seller portal not built yet). */
export interface OrderDeliverySummary {
  streetAddress: string
  suburb: string
  state: string
  postcode: string
  carrierName: string | null
  trackingNumber: string | null
  estimatedDeliveryAt: Date | null
}

/** One row of the My Orders list. */
export interface OrderSummary {
  orderNumber: string
  placedAt: Date
  status: OrderStatus
  supplierName: string
  items: OrderSummaryItem[]
  total: string
  delivery: OrderDeliverySummary
}

/** One priced line of an order; unlike the list, prices are shown. */
export interface OrderDetailItem {
  productId: string
  productName: string
  sku: string
  quantity: number
  unitPrice: string
  lineTotal: string
}

/** DeliveryView plus the fields that only exist once the seller dispatches. */
export interface OrderDetailDelivery extends DeliveryView {
  carrierName: string | null
  trackingNumber: string | null
  dispatchedAt: Date | null
  estimatedDeliveryAt: Date | null
  deliveredAt: Date | null
}

/** An order's full detail. No invoiceNumber: the invoice may not exist yet, fetched separately. */
export interface OrderDetail {
  orderNumber: string
  placedAt: Date
  status: OrderStatus
  cancellationReason: string | null
  supplierName: string
  items: OrderDetailItem[]
  subtotal: string
  gstTotal: string
  total: string
  delivery: OrderDetailDelivery
  payment: PaymentView
}

/** One line's outcome when re-adding a past order's items to the cart. */
export interface ReorderLineResult {
  productId: string
  productName: string
  requestedQuantity: number
  added: boolean
  /** Why the line was skipped — the same message CartService.addItem throws. Null when added. */
  reason: string | null
}

/** POST /orders/:orderNumber/reorder — the updated cart, plus what happened per line. */
export interface ReorderResult {
  cart: CartView
  lines: ReorderLineResult[]
}
