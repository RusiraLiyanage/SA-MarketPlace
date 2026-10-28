import { AppError } from '@sa-marketplace/common'

// Codes must be AppError values: the exception filter turns unknown codes into 500s.
export const OrdersError = {
  // Also covers another seller's order, so it looks identical to a missing one (ADR 0025).
  ORDER_NOT_FOUND: {
    code: AppError.ECB404,
    message: 'Order not found',
  },
  // The order can no longer be fulfilled: already dispatched, delivered or cancelled.
  CANNOT_FULFIL: {
    code: AppError.ECB409,
    message: 'Cannot fulfil this order',
  },
  ORDER_NOT_CANCELLABLE: {
    code: AppError.ECB409,
    message: 'This order can no longer be cancelled',
  },
} as const
