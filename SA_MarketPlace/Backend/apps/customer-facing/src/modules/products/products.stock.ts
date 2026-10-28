import { StockStatus } from './products.typing'

// Out of stock at 0, low at or below the threshold, otherwise in stock.
// Shared by the catalogue and the cart, so the two can never disagree.
export const toStockStatus = (
  quantity: number,
  lowStockThreshold: number,
): StockStatus => {
  if (quantity <= 0) {
    return StockStatus.outOfStock
  }
  if (quantity <= lowStockThreshold) {
    return StockStatus.lowStock
  }
  return StockStatus.inStock
}
