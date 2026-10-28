import { AppError } from '@sa-marketplace/common'

// Codes must be AppError values: the exception filter turns unknown codes into 500s.
export const CheckoutError = {
  CART_EMPTY: {
    code: AppError.ECB001,
    message: 'Your cart is empty',
  },
  // Append the names of the lines that failed, so the frontend can point at them.
  ITEMS_UNAVAILABLE: {
    code: AppError.ECB409,
    message: 'Some items in your cart can no longer be ordered',
  },
  INSUFFICIENT_STOCK: {
    code: AppError.ECB409,
    message: 'Not enough stock for one or more items',
  },
  INVALID_CARD: {
    code: AppError.ECB001,
    message: 'The card details are not valid',
  },
  PAYMENT_DECLINED: {
    code: AppError.ECB402,
    message: 'Your card was declined',
  },
} as const
