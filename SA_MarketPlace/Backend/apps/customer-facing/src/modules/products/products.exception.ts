import { AppError } from '@sa-marketplace/common'

// Codes must be AppError values: the exception filter turns unknown codes into 500s.
export const ProductsError = {
  // Also used for hidden products, so they look identical to missing ones.
  PRODUCT_NOT_FOUND: {
    code: AppError.ECB404,
    message: 'Product not found',
  },
} as const
