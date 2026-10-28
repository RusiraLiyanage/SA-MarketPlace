import { AppError } from '@sa-marketplace/common'

// Codes must be AppError values: the exception filter turns unknown codes into 500s.
export const ApplicationError = {
  PROFILE_NOT_FOUND: {
    code: AppError.ECB404,
    message: 'No supplier application found for this account',
  },
  NOT_APPROVED: {
    code: AppError.ECB409,
    message: 'Only an approved application can be acknowledged',
  },
  NOT_REJECTED: {
    code: AppError.ECB409,
    message: 'Only a rejected application can be updated and resubmitted',
  },
} as const
