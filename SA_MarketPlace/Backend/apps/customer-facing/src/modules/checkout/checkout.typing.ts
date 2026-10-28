import {
  CartItem,
  Delivery,
  Order,
  PaymentMethod,
  PaymentStatus,
  SupplierProfile,
} from '@sa-marketplace/entities'

/** One line of a placed order. Price is frozen at checkout (CLAUDE.md §4.2). */
export interface PlacedOrderItem {
  productId: string
  name: string
  sku: string
  quantity: number
  /** GST-inclusive, as a string (ADR 0008). */
  unitPrice: string
  lineTotal: string
}

/** One placed order in the checkout result: one per supplier (§4.3). */
export interface PlacedOrder {
  orderNumber: string
  placedAt: Date
  supplierName: string
  items: PlacedOrderItem[]
  subtotal: string
  gstTotal: string
  total: string
  /** Each supplier has its own dispatch SLA, so this can differ between orders. */
  estimatedDeliveryAt: Date | null
}

export interface DeliveryView {
  attentionName: string | null
  streetAddress: string
  suburb: string
  state: string
  postcode: string
  country: string
  notes: string | null
}

/** Never carries a card number, CVC or expiry (§4.6). */
export interface PaymentView {
  method: PaymentMethod
  status: PaymentStatus
  cardBrand: string | null
  cardLast4: string | null
  transactionReference: string | null
  paidAt: Date | null
}

export interface CheckoutResult {
  orders: PlacedOrder[]
  delivery: DeliveryView
  payment: PaymentView
  /** Grand total across all orders, GST-inclusive. */
  total: string
  /** The GST already inside `total` — total ÷ 11. */
  gstIncluded: string
}

/** What the payment service hands back. Only these card fields may be stored. */
export interface PaymentResult {
  status: PaymentStatus
  transactionReference: string | null
  cardLast4: string | null
  cardBrand: string | null
  paidAt: Date | null
}

/** Cart lines from one supplier — each group becomes one order. */
export interface SupplierGroup {
  supplier: SupplierProfile
  lines: CartItem[]
}

/** A group after its order and delivery rows exist. */
export interface PlacedGroup {
  order: Order
  group: SupplierGroup
  delivery: Delivery
}
