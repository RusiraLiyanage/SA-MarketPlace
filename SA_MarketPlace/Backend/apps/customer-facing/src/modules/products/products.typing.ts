// The price-range filter options (CLAUDE.md §6). Leave it out for "Any price".
export enum PriceRange {
  under20 = 'under_20',
  from20To50 = '20_to_50',
  over50 = 'over_50',
}

// Derived from quantity and lowStockThreshold, never stored (CLAUDE.md §4.7).
export enum StockStatus {
  inStock = 'in_stock',
  lowStock = 'low_stock',
  outOfStock = 'out_of_stock',
}

export interface CategoryOption {
  id: string
  name: string
  slug: string
}

export interface ProductImageView {
  path: string
  altText: string | null
  isPrimary: boolean
}

/** One product in the catalogue list. */
export interface ProductListItem {
  id: string
  name: string
  /** GST-inclusive, kept as a string (ADR 0008). */
  price: string
  stockStatus: StockStatus
  category: CategoryOption
  primaryImage: ProductImageView | null
  supplierName: string
}

/** A product's full detail: description and specifications included. */
export interface ProductDetail extends ProductListItem {
  description: string | null
  sku: string
  brand: string | null
  manufacturer: string | null
  packSize: string | null
  certification: string | null
  storageConditions: string | null
  shelfLifeMonths: number | null
  images: ProductImageView[]
}
