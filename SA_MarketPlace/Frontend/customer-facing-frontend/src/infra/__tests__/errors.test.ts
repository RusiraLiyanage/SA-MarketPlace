import { describe, expect, it } from 'vitest'
import { ERROR_CODE, getErrorMessage, isApiError } from 'src/infra/errors'

describe('errors', () => {
  const apiError = { status: 409, code: ERROR_CODE.conflict, message: 'Email already registered' }

  it('recognises an ApiError and nothing else', () => {
    expect(isApiError(apiError)).toBe(true)
    expect(isApiError(new Error('boom'))).toBe(false)
    expect(isApiError({ status: 'FETCH_ERROR' })).toBe(false)
    expect(isApiError(undefined)).toBe(false)
  })

  it("shows the backend's message when there is one, and a general one otherwise", () => {
    expect(getErrorMessage(apiError)).toBe('Email already registered')
    expect(getErrorMessage(new Error('boom'))).toBe('Something went wrong. Please try again.')
    expect(getErrorMessage(undefined, 'Could not save')).toBe('Could not save')
  })
})
