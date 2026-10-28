import { StockStatus } from './products.typing'
import { toStockStatus } from './products.stock'

describe('toStockStatus', () => {
  it('is out of stock at zero', () => {
    expect(toStockStatus(0, 10)).toBe(StockStatus.outOfStock)
  })

  it('is out of stock below zero', () => {
    expect(toStockStatus(-1, 10)).toBe(StockStatus.outOfStock)
  })

  it('is low stock at exactly the threshold', () => {
    expect(toStockStatus(10, 10)).toBe(StockStatus.lowStock)
  })

  it('is low stock below the threshold', () => {
    expect(toStockStatus(5, 10)).toBe(StockStatus.lowStock)
  })

  it('is in stock just above the threshold', () => {
    expect(toStockStatus(11, 10)).toBe(StockStatus.inStock)
  })

  it('is in stock well above the threshold', () => {
    expect(toStockStatus(1000, 10)).toBe(StockStatus.inStock)
  })
})
