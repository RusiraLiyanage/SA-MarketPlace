import { HttpStatus } from '@nestjs/common'
import {
  AppError,
  BusinessException,
  getAppErrorForStatus,
  getStatusForAppError,
} from './app.exception'

describe('getStatusForAppError', () => {
  it('maps known codes to their status', () => {
    expect(getStatusForAppError(AppError.ECB404)).toBe(HttpStatus.NOT_FOUND)
    expect(getStatusForAppError(AppError.ECB409)).toBe(HttpStatus.CONFLICT)
    expect(getStatusForAppError(AppError.ECB402)).toBe(
      HttpStatus.PAYMENT_REQUIRED,
    )
  })

  it('falls back to 500 for an unmapped code', () => {
    expect(getStatusForAppError('NOT_A_CODE')).toBe(
      HttpStatus.INTERNAL_SERVER_ERROR,
    )
  })
})

describe('getAppErrorForStatus', () => {
  it('maps known statuses to their code', () => {
    expect(getAppErrorForStatus(HttpStatus.UNAUTHORIZED)).toBe(AppError.EUA001)
    expect(getAppErrorForStatus(HttpStatus.PAYMENT_REQUIRED)).toBe(
      AppError.ECB402,
    )
  })

  it('falls back by class for unmapped statuses', () => {
    expect(getAppErrorForStatus(HttpStatus.I_AM_A_TEAPOT)).toBe(AppError.ECB001)
    expect(getAppErrorForStatus(HttpStatus.BAD_GATEWAY)).toBe(AppError.ECI500)
  })
})

describe('BusinessException', () => {
  it('keeps the code and message in the right fields', () => {
    const exception = new BusinessException(
      AppError.ECB409,
      'Email already registered',
    )

    expect(exception.error).toBe(AppError.ECB409)
    expect(exception.message).toBe('Email already registered')
    expect(exception.name).toBe('BusinessException')
  })

  it('falls back to the code when no message is given', () => {
    expect(new BusinessException(AppError.ECB404).message).toBe(AppError.ECB404)
  })
})
