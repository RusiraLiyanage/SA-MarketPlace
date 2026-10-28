import type { Cart } from 'src/types/cart'

export const OrderStatus = {
  placed: 'placed',
  confirmed: 'confirmed',
  picking: 'picking',
  dispatched: 'dispatched',
  delivered: 'delivered',
  cancelled: 'cancelled',
} as const
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]

export type PaymentMethod = 'card_mock' | 'invoice_on_account'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface Delivery {
  attentionName: string | null
  streetAddress: string
  suburb: string
  state: string
  postcode: string
  country: string
  notes: string | null
}

export interface Payment {
  method: PaymentMethod
  status: PaymentStatus
  cardBrand: string | null
  cardLast4: string | null
  transactionReference: string | null
  paidAt: string | null
}

export interface OrderSummary {
  orderNumber: string
  placedAt: string
  status: OrderStatus
  supplierName: string
  items: { productName: string; quantity: number }[]
  total: string
  delivery: {
    streetAddress: string
    suburb: string
    state: string
    postcode: string
    carrierName: string | null
    trackingNumber: string | null
    estimatedDeliveryAt: string | null
  }
}

export interface OrderDetailItem {
  productId: string
  productName: string
  sku: string
  quantity: number
  unitPrice: string
  lineTotal: string
}

export interface OrderDetail {
  orderNumber: string
  placedAt: string
  status: OrderStatus
  cancellationReason: string | null
  supplierName: string
  items: OrderDetailItem[]
  subtotal: string
  gstTotal: string
  total: string
  delivery: Delivery & {
    carrierName: string | null
    trackingNumber: string | null
    dispatchedAt: string | null
    estimatedDeliveryAt: string | null
    deliveredAt: string | null
  }
  payment: Payment
}

export interface PlacedOrder {
  orderNumber: string
  placedAt: string
  supplierName: string
  items: { productId: string; name: string; sku: string; quantity: number; unitPrice: string; lineTotal: string }[]
  subtotal: string
  gstTotal: string
  total: string
  estimatedDeliveryAt: string | null
}

export interface CheckoutResult {
  orders: PlacedOrder[]
  delivery: Delivery
  payment: Payment
  total: string
  gstIncluded: string
}

/** One line's outcome when a past order's items are added back to the cart. */
export interface ReorderLineResult {
  productId: string
  productName: string
  requestedQuantity: number
  added: boolean
  /** Why the line was skipped; null when it was added. */
  reason: string | null
}

/** POST /orders/:orderNumber/reorder: the updated cart plus what happened to each line. */
export interface ReorderResult {
  cart: Cart
  lines: ReorderLineResult[]
}
