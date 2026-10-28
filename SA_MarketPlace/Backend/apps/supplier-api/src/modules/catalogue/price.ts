// Prices stay strings (ADR 0008). Pads to two decimals and drops leading zeros,
// so the value matches what numeric(10,2) stores: "7.5" -> "7.50", "007" -> "7.00".
export const formatPrice = (price: string): string => {
  const [whole, fraction = ''] = price.split('.')
  return `${whole.replace(/^0+(?=\d)/, '')}.${fraction.padEnd(2, '0')}`
}
