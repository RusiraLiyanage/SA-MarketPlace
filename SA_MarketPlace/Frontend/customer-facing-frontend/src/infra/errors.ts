// The backend's error codes (`error` in its error body); stable, unlike the messages.
export const ERROR_CODE = {
  badRequest: 'ECB001',
  unauthenticated: 'EUA001',
  paymentRequired: 'ECB402',
  forbidden: 'ECB403',
  notFound: 'ECB404',
  conflict: 'ECB409',
  tooManyRequests: 'ECB429',
  internal: 'ECI500',
  /** Added here: the request never got an answer (offline, timeout). */
  network: 'NETWORK',
  /** Added here: a status or body the backend does not normally send. */
  unknown: 'UNKNOWN',
} as const

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE]

/** Every failed request, whatever went wrong, arrives in this one shape. */
export interface ApiError {
  /** The HTTP status; 0 when there was no response. */
  status: number
  code: ErrorCode
  /** Safe to show to the buyer. */
  message: string
}

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.'

export const isApiError = (error: unknown): error is ApiError =>
  typeof error === 'object' &&
  error !== null &&
  typeof (error as ApiError).status === 'number' &&
  typeof (error as ApiError).code === 'string' &&
  typeof (error as ApiError).message === 'string'

/** The text to show for a failure caught from `.unwrap()` or read from a hook's `error`. */
export const getErrorMessage = (error: unknown, fallback = DEFAULT_MESSAGE): string =>
  isApiError(error) ? error.message : fallback
