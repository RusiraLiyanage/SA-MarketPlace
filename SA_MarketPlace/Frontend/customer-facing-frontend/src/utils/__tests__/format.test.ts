import { describe, expect, it } from 'vitest'
import { formatCurrency, formatDate, formatMonthYear, initials, pluralise } from 'src/utils/format'

describe('formatCurrency', () => {
  it('formats a price string as Australian dollars', () => {
    expect(formatCurrency('24.99')).toBe('$24.99')
    expect(formatCurrency('1234.5')).toBe('$1,234.50')
  })

  it('accepts a number', () => {
    expect(formatCurrency(9.75)).toBe('$9.75')
  })
})

describe('formatDate', () => {
  it('shows the day in Sydney time', () => {
    expect(formatDate('2026-07-25T01:00:00.000Z')).toBe('25 Jul 2026')
  })

  it('rolls a late-evening UTC instant over to the next Sydney day', () => {
    expect(formatDate('2026-07-24T15:00:00.000Z')).toBe('25 Jul 2026')
  })
})

describe('formatMonthYear', () => {
  it('shows the month and year in Sydney time', () => {
    expect(formatMonthYear('2026-01-12T00:00:00.000Z')).toBe('Jan 2026')
    expect(formatMonthYear('2025-12-31T15:00:00.000Z')).toBe('Jan 2026')
  })
})

describe('initials', () => {
  it('upper-cases the first letter of each name', () => {
    expect(initials('jordan', 'shaw')).toBe('JS')
  })
})

describe('pluralise', () => {
  it('uses the singular for one and the plural otherwise', () => {
    expect(pluralise(1, 'item')).toBe('1 item')
    expect(pluralise(3, 'item')).toBe('3 items')
    expect(pluralise(0, 'item')).toBe('0 items')
  })
})
