import type { StockStatus } from 'src/types/product'

export interface CartItem {
  productId: string
  name: string
  price: string
  quantity: number
  lineTotal: string
  stockStatus: StockStatus
  /** The supplier's stock on hand; the cart reserves nothing. */
  stockOnHand: number
  unavailableReason: string | null
  supplierProfileId: string
  supplierName: string
}

export interface CartSummary {
  itemCount: number
  total: string
  /** The GST already inside the total (total divided by 11). */
  gstIncluded: string
}

export interface Cart {
  cartId: string
  items: CartItem[]
  summary: CartSummary
}
