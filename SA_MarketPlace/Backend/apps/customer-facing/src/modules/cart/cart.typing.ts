import { StockStatus } from '../products/products.typing'

/** One line in the cart. Price is live, never frozen (CLAUDE.md §4.2). */
export interface CartItemView {
  productId: string
  name: string
  /** GST-inclusive unit price, as a string (ADR 0008). */
  price: string
  quantity: number
  /** price × quantity. */
  lineTotal: string
  stockStatus: StockStatus
  /** The supplier's stock on hand. A cart reserves nothing, so it only drops when an order is placed. */
  stockOnHand: number
  /** Set when the line cannot be ordered: retired, supplier removed, or short stock. */
  unavailableReason: string | null
  /** Who sells it. Checkout groups by supplier itself, straight from the database. */
  supplierProfileId: string
  supplierName: string
}

/** Totals computed on every read, never stored (§4.2); only orderable lines count. */
export interface CartSummary {
  /** Sum of quantities of the orderable lines. */
  itemCount: number
  /** Sum of the orderable line totals, GST-inclusive. */
  total: string
  /** The GST already inside `total` — total ÷ 11, not added on top. */
  gstIncluded: string
}

export interface CartView {
  cartId: string
  items: CartItemView[]
  summary: CartSummary
}
