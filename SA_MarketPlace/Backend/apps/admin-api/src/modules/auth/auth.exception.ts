import { AppError } from '@sa-marketplace/common'

// Codes must be AppError values: the exception filter turns unknown codes into 500s.
export const AuthError = {
  // Admin sign-up is limited to Sample Assist staff addresses (ADR 0038).
  EMAIL_DOMAIN_NOT_ALLOWED: {
    code: AppError.ECB001,
    message:
      'Admin accounts are only available to Sample Assist staff email addresses',
  },
} as const
