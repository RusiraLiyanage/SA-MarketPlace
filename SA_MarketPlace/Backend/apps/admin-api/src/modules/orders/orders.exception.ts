import { AppError } from '@sa-marketplace/common'

// Codes must be AppError values: the exception filter turns unknown codes into 500s.
export const OrdersError = {
  ORDER_NOT_FOUND: {
    code: AppError.ECB404,
    message: 'Order not found',
  },
  EXPORT_TOO_LARGE: {
    code: AppError.ECB001,
    message: 'Too many orders to export at once; narrow the filters',
  },
} as const
