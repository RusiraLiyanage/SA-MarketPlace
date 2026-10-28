import { formatPrice } from './price'

describe('formatPrice', () => {
  it.each([
    ['10.5', '10.50'],
    ['10', '10.00'],
    ['10.50', '10.50'],
    ['0.5', '0.50'],
    ['007.5', '7.50'],
    ['99999999.99', '99999999.99'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatPrice(input)).toBe(expected)
  })
})
