// The Australian Business Number: eleven digits, shown in groups ("51 824 753 556"). The admin app only shows them: the backend
// checks the checksum when a supplier registers.

/** "51 824 753 556" or "51824753556" → "51824753556". */
export const abnDigits = (value: string): string => value.replace(/\D/g, '')

/** Spaces the digits as 2-3-3-3; anything past eleven digits is dropped. */
export const formatAbn = (value: string): string => {
  const digits = abnDigits(value).slice(0, 11)
  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 8), digits.slice(8, 11)].filter(Boolean).join(' ')
}
