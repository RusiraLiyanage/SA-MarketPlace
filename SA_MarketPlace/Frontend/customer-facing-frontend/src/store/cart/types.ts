export interface AddCartItemRequest {
  productId: string
  /** Added to what is already in the cart for this product; the backend defaults it to 1. */
  quantity?: number
}

export interface SetCartItemQuantityRequest {
  productId: string
  /** The new total for the line, not an amount to add. 0 removes it. */
  quantity: number
}
