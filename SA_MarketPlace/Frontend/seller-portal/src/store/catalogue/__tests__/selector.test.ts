import { describe, expect, it } from 'vitest'
import { isEditable, lowStockMessage, priceProblem } from 'src/store/catalogue/selector'

describe('lowStockMessage', () => {
  it('is nothing when nothing is low', () => {
    expect(lowStockMessage([])).toBeNull()
  })

  it('names the one product and how many units are left', () => {
    expect(lowStockMessage([{ id: '1', name: 'Hair Follicle Test Kit', quantity: 12 }])).toEqual({
      title: 'Hair Follicle Test Kit is running low on stock (12 units left)',
    })
    expect(lowStockMessage([{ id: '1', name: 'Kit', quantity: 1 }])?.title).toBe('Kit is running low on stock (1 unit left)')
  })

  it('says a product with none left is out of stock', () => {
    expect(lowStockMessage([{ id: '1', name: 'Kit', quantity: 0 }])?.title).toBe('Kit is out of stock')
  })

  it('counts several products and lists each', () => {
    expect(
      lowStockMessage([
        { id: '1', name: 'Kit', quantity: 3 },
        { id: '2', name: 'Strips', quantity: 0 },
      ]),
    ).toEqual({ title: '2 products need restocking', items: ['Kit is running low on stock (3 units left)', 'Strips is out of stock'] })
  })
})

describe('priceProblem', () => {
  it.each(['24.99', '89', '0.5', '99999999.99', ' 12.50 '])('accepts %s', (text) => {
    expect(priceProblem(text)).toBeNull()
  })

  it.each(['', '0', '0.00', '-5', '12.345', 'abc', '1e3', '123456789', '$12'])('refuses "%s"', (text) => {
    expect(priceProblem(text)).toBe('Enter a price above $0 with at most 2 decimals')
  })
})

describe('isEditable', () => {
  it('is false only for a retired product, which the backend refuses to edit', () => {
    expect(isEditable('draft')).toBe(true)
    expect(isEditable('published')).toBe(true)
    expect(isEditable('retired')).toBe(false)
  })
})
