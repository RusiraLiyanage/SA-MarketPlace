const digitsOnly = (value: string) => value.replace(/\D/g, '')

// "4242424242424242" → "4242 4242 4242 4242", as the card number is typed.
export const formatCardNumber = (value: string): string =>
  digitsOnly(value).slice(0, 19).replace(/(.{4})/g, '$1 ').trim()

// "1228" → "12 / 28", as the expiry is typed.
export const formatExpiry = (value: string): string => {
  const digits = digitsOnly(value).slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)} / ${digits.slice(2)}` : digits
}

// 13 to 19 digits that pass the Luhn check, the same test the backend runs.
export const isValidCardNumber = (value: string): boolean => {
  const digits = digitsOnly(value)
  if (digits.length < 13 || digits.length > 19) return false

  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i])
    if (double) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    double = !double
  }
  return sum % 10 === 0
}

export interface Expiry {
  month: number
  /** The full year, e.g. 2029. */
  year: number
}

// "12 / 28" → { month: 12, year: 2028 }; anything else is null.
export const parseExpiry = (value: string): Expiry | null => {
  const digits = digitsOnly(value)
  if (digits.length !== 4) return null
  const month = Number(digits.slice(0, 2))
  return month >= 1 && month <= 12 ? { month, year: 2000 + Number(digits.slice(2)) } : null
}

// A card is good until the end of its expiry month.
export const isExpired = ({ month, year }: Expiry, now = new Date()): boolean =>
  new Date(year, month, 1) <= now
