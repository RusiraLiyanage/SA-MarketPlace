import { AppError } from '@sa-marketplace/common'

// Codes must be AppError values: the exception filter turns unknown codes into 500s.
export const OrdersError = {
  // Also covers another buyer's order, so it looks identical to a missing one.
  ORDER_NOT_FOUND: {
    code: AppError.ECB404,
    message: 'Order not found',
  },
} as const
