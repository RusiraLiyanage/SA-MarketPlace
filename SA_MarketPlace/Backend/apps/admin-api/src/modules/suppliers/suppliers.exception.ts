import { AppError } from '@sa-marketplace/common'

// Codes must be AppError values: the exception filter turns unknown codes into 500s.
export const SupplierError = {
  NOT_FOUND: {
    code: AppError.ECB404,
    message: 'Supplier application not found',
  },
  NOT_PENDING: {
    code: AppError.ECB409,
    message: 'This application has already been approved or rejected',
  },
  DETAIL_REQUIRED: {
    code: AppError.ECB001,
    message: 'Additional detail is required when the reason is "other"',
  },
} as const
