import { fromCents, gstIncludedInCents, toCents } from './money'

describe('toCents', () => {
  it('reads whole dollars', () => {
    expect(toCents('24')).toBe(2400)
  })

  it('reads two decimal places', () => {
    expect(toCents('24.99')).toBe(2499)
  })

  it('pads a single decimal place', () => {
    expect(toCents('24.5')).toBe(2450)
  })

  it('treats a missing decimal part as zero cents', () => {
    expect(toCents('24.')).toBe(2400)
  })

  it('never produces a floating-point remainder', () => {
    // The classic float trap: 0.1 + 0.2 !== 0.3 in plain JS arithmetic.
    expect(toCents('0.1') + toCents('0.2')).toBe(toCents('0.3'))
  })
})

describe('fromCents', () => {
  it('formats whole dollars with two decimal places', () => {
    expect(fromCents(2400)).toBe('24.00')
  })

  it('pads a single-digit cents remainder', () => {
    expect(fromCents(2405)).toBe('24.05')
  })

  it('round-trips through toCents', () => {
    expect(fromCents(toCents('123.45'))).toBe('123.45')
  })
})

describe('gstIncludedInCents', () => {
  it('is total ÷ 11 (10% of the ex-GST amount, on a GST-inclusive total)', () => {
    // $60.00 inclusive -> $54.55 ex-GST + $5.45 GST.
    expect(gstIncludedInCents(6000)).toBe(545)
  })

  it('rounds to the nearest cent', () => {
    expect(gstIncludedInCents(100)).toBe(9) // 100 / 11 = 9.09...
  })
})
