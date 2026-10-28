import { describe, expect, it } from 'vitest'
import { formatCardNumber, formatExpiry, isExpired, isValidCardNumber, parseExpiry } from 'src/utils/card'

describe('formatCardNumber', () => {
  it('groups the digits by four and ignores anything else', () => {
    expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242')
    expect(formatCardNumber('4242-4242 42')).toBe('4242 4242 42')
    expect(formatCardNumber('abc')).toBe('')
  })

  it('stops at 19 digits', () => {
    expect(formatCardNumber('1'.repeat(25)).replace(/ /g, '')).toHaveLength(19)
  })
})

describe('isValidCardNumber', () => {
  it.each(['4242 4242 4242 4242', '4000 0000 0000 0002', '4242424242424242'])('accepts %s', (number) => {
    expect(isValidCardNumber(number)).toBe(true)
  })

  it.each([
    ['fails the checksum', '4242 4242 4242 4241'],
    ['is too short', '4242 4242 4242'],
    ['has a digit missing, as 242424242424242 did', '242424242424242'],
    ['is empty', ''],
  ])('rejects a number that %s', (_why, number) => {
    expect(isValidCardNumber(number)).toBe(false)
  })
})

describe('expiry', () => {
  it('formats as MM / YY while typing', () => {
    expect(formatExpiry('1')).toBe('1')
    expect(formatExpiry('12')).toBe('12')
    expect(formatExpiry('122')).toBe('12 / 2')
    expect(formatExpiry('1228')).toBe('12 / 28')
  })

  it('reads a month and a full year', () => {
    expect(parseExpiry('12 / 28')).toEqual({ month: 12, year: 2028 })
  })

  it.each(['13 / 28', '00 / 28', '12 / 2', ''])('rejects %s', (value) => {
    expect(parseExpiry(value)).toBeNull()
  })

  it('is good until the end of the expiry month', () => {
    const now = new Date(2026, 9, 24)
    expect(isExpired({ month: 10, year: 2026 }, now)).toBe(false)
    expect(isExpired({ month: 9, year: 2026 }, now)).toBe(true)
    expect(isExpired({ month: 12, year: 2028 }, now)).toBe(false)
  })
})
