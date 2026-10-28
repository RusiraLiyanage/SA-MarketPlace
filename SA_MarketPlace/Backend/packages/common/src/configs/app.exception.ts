import { HttpStatus } from '@nestjs/common'

/** Error codes sent in the `error` field of every response envelope (see `TBaseDto`); stable, unlike messages. */
export enum AppError {
  /** Bad request — validation failed or the payload made no sense. */
  ECB001 = 'ECB001',
  /** Unauthenticated — no credentials, or they were not valid. */
  EUA001 = 'EUA001',
  /** Forbidden — authenticated, but not allowed to do this. */
  ECB403 = 'ECB403',
  /** Not found — the entity does not exist (or is not visible to this caller). */
  ECB404 = 'ECB404',
  /** Conflict — e.g. registering an email that already has an account. */
  ECB409 = 'ECB409',
  /** Payment required — the card was declined. */
  ECB402 = 'ECB402',
  /** Too many requests — rate limited. */
  ECB429 = 'ECB429',
  /** Unhandled internal error. */
  ECI500 = 'ECI500',
}

const APP_ERROR_STATUS: Record<AppError, HttpStatus> = {
  [AppError.ECB001]: HttpStatus.BAD_REQUEST,
  [AppError.EUA001]: HttpStatus.UNAUTHORIZED,
  [AppError.ECB403]: HttpStatus.FORBIDDEN,
  [AppError.ECB404]: HttpStatus.NOT_FOUND,
  [AppError.ECB409]: HttpStatus.CONFLICT,
  [AppError.ECB402]: HttpStatus.PAYMENT_REQUIRED,
  [AppError.ECB429]: HttpStatus.TOO_MANY_REQUESTS,
  [AppError.ECI500]: HttpStatus.INTERNAL_SERVER_ERROR,
}

const STATUS_APP_ERROR: Partial<Record<HttpStatus, AppError>> = {
  [HttpStatus.BAD_REQUEST]: AppError.ECB001,
  [HttpStatus.UNAUTHORIZED]: AppError.EUA001,
  [HttpStatus.FORBIDDEN]: AppError.ECB403,
  [HttpStatus.NOT_FOUND]: AppError.ECB404,
  [HttpStatus.CONFLICT]: AppError.ECB409,
  [HttpStatus.PAYMENT_REQUIRED]: AppError.ECB402,
  [HttpStatus.TOO_MANY_REQUESTS]: AppError.ECB429,
}

/** HTTP status for an application error code. Unknown codes are treated as internal. */
export const getStatusForAppError = (error: string): HttpStatus =>
  APP_ERROR_STATUS[error as AppError] ?? HttpStatus.INTERNAL_SERVER_ERROR

/** Application error code for an HTTP status raised outside our own exceptions. */
export const getAppErrorForStatus = (status: HttpStatus): AppError =>
  STATUS_APP_ERROR[status] ??
  (status < HttpStatus.INTERNAL_SERVER_ERROR
    ? AppError.ECB001
    : AppError.ECI500)

export abstract class BaseException extends Error {
  public readonly error: string

  constructor(error: string, message?: string) {
    super(message ?? error)
    this.error = error
    // Without this, every subclass reports as "Error" in stack traces.
    this.name = new.target.name
  }
}

/** Thrown when a well-formed request breaks a business rule in the current state. */
export class BusinessException extends BaseException {
  constructor(error: AppError | string, message?: string) {
    super(error, message)
  }
}
