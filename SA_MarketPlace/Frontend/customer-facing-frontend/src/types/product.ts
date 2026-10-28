export const StockStatus = { inStock: 'in_stock', lowStock: 'low_stock', outOfStock: 'out_of_stock' } as const
export type StockStatus = (typeof StockStatus)[keyof typeof StockStatus]

export interface CategoryOption {
  id: string
  name: string
  slug: string
}

export interface ProductImage {
  path: string
  altText: string | null
  isPrimary: boolean
}

export interface ProductListItem {
  id: string
  name: string
  /** GST-inclusive, kept as a string like the backend. */
  price: string
  stockStatus: StockStatus
  category: CategoryOption
  primaryImage: ProductImage | null
  supplierName: string
}

export interface ProductDetail extends ProductListItem {
  description: string | null
  sku: string
  brand: string | null
  manufacturer: string | null
  packSize: string | null
  certification: string | null
  storageConditions: string | null
  shelfLifeMonths: number | null
  images: ProductImage[]
}
