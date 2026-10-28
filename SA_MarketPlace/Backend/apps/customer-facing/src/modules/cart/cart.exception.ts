import { AppError } from '@sa-marketplace/common'

// Codes must be AppError values: the exception filter turns unknown codes into 500s.
export const CartError = {
  // Same 404 as the catalogue, so a hidden product stays hidden.
  PRODUCT_NOT_FOUND: {
    code: AppError.ECB404,
    message: 'Product not found',
  },
  ITEM_NOT_IN_CART: {
    code: AppError.ECB404,
    message: 'That product is not in your cart',
  },
  INSUFFICIENT_STOCK: {
    code: AppError.ECB409,
    message: 'Not enough stock for that quantity',
  },
} as const
