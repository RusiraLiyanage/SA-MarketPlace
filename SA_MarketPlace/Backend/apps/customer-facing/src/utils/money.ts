// Money is worked out in whole cents, never floats: 0.1 + 0.2 !== 0.3 (ADR 0008).

/** "24.99" → 2499. Reads the digits, so no floating point is involved. */
export const toCents = (amount: string): number => {
  const [dollars, cents = ''] = amount.split('.')
  return Number(dollars) * 100 + Number(cents.padEnd(2, '0').slice(0, 2))
}

/** 2499 → "24.99". */
export const fromCents = (cents: number): string =>
  `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`

/** Prices are GST-inclusive, so the GST inside a total is total ÷ 11 (10% of the ex-GST amount). */
export const gstIncludedInCents = (totalCents: number): number =>
  Math.round(totalCents / 11)
