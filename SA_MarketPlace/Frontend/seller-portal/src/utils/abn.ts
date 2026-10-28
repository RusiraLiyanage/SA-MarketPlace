// The Australian Business Number: eleven digits, shown in groups ("51 824 753 556") and checked with the ATO checksum.
// The same algorithm as the backend's `@IsAbn()`, so a number the form accepts is one the API accepts.
const WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]

/** "51 824 753 556" or "51824753556" → "51824753556". */
export const abnDigits = (value: string): string => value.replace(/\D/g, '')

/** Spaces the digits as 2-3-3-3 while typing; anything past eleven digits is dropped. */
export const formatAbn = (value: string): string => {
  const digits = abnDigits(value).slice(0, 11)
  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 8), digits.slice(8, 11)].filter(Boolean).join(' ')
}

export const isValidAbn = (value: string): boolean => {
  const digits = abnDigits(value)
  if (digits.length !== 11) return false

  const sum = [...digits].reduce((total, digit, index) => total + (index === 0 ? Number(digit) - 1 : Number(digit)) * WEIGHTS[index]!, 0)
  return sum % 89 === 0
}
