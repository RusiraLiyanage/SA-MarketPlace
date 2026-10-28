import { formatDate } from './helpers'

// 01 Sep 2026 04:30 UTC is 14:30 the same day in Sydney (AEST, UTC+10).
const instant = '2026-09-01T04:30:00Z'

describe('formatDate', () => {
  it('formats a UTC instant in Australian Eastern time', () => {
    expect(formatDate(instant)).toBe('01/09/2026')
  })

  it('accepts a Date as well as a string', () => {
    expect(formatDate(new Date(instant))).toBe('01/09/2026')
  })

  it('includes the local time for the dateTime style', () => {
    expect(formatDate(instant, { style: 'dateTime' })).toContain('14:30')
  })

  it('honours an explicit timezone', () => {
    expect(formatDate(instant, { timeZone: 'UTC', style: 'time' })).toContain(
      '04:30',
    )
  })

  it('returns an empty string for empty or unparseable input', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
    expect(formatDate('')).toBe('')
    expect(formatDate('not a date')).toBe('')
  })

  it('returns an empty string for an unknown timezone', () => {
    expect(formatDate(instant, { timeZone: 'Mars/Olympus_Mons' })).toBe('')
  })
})
