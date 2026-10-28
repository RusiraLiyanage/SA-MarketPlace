import type { PaginatedData } from 'src/infra/pagination'

export const ListingStatus = { draft: 'draft', published: 'published', retired: 'retired' } as const
export type ListingStatus = (typeof ListingStatus)[keyof typeof ListingStatus]

/** One row of the catalogue table. Edit and Retire act on `id`. */
export interface CatalogueListItem {
  id: string
  name: string
  sku: string
  /** GST-inclusive, kept as a string like the backend. */
  price: string
  /** The seller's sellable stock. */
  quantity: number
  listingStatus: ListingStatus
}

/** A published product at or below its low-stock threshold; the warning banner lists these. */
export interface LowStockProduct {
  id: string
  name: string
  quantity: number
}

/** One page of rows, plus the low-stock banner, which ignores the filters and the paging. */
export interface CatalogueList extends PaginatedData<CatalogueListItem> {
  lowStock: LowStockProduct[]
}

export type CatalogueSortField = 'name' | 'price' | 'quantity'

export interface ListCatalogueRequest {
  page: number
  limit: number
  /** Left out for All, which includes retired. */
  status?: ListingStatus
  /** Matched against the product name and the SKU. */
  search?: string
  orderField?: CatalogueSortField
  order?: 'ASC' | 'DESC'
}

export interface CategoryOption {
  id: string
  name: string
}

/** A top-level category with its sub-categories, for the two dropdowns. */
export interface CategoryTreeItem extends CategoryOption {
  children: CategoryOption[]
}

/** One stored image. `path` is relative; the backend serves it under /media. */
export interface ProductImage {
  id: string
  path: string
  altText: string | null
  isPrimary: boolean
  sortOrder: number
}

/** One product as the form shows it; also what saving one returns. */
export interface ProductEdit {
  id: string
  name: string
  description: string | null
  sku: string
  /** GST-inclusive, kept as a string like the backend. */
  price: string
  quantity: number
  lowStockThreshold: number
  listingStatus: ListingStatus
  /** The most specific category chosen: the sub-category if there is one, else the category. */
  categoryId: string
  brand: string | null
  manufacturer: string | null
  packSize: string | null
  certification: string | null
  /** In display order; the first is the primary image. */
  images: ProductImage[]
  category: CategoryOption
  /** Null when the product sits directly in a top-level category. */
  subCategory: CategoryOption | null
  createdAt: string
  updatedAt: string
}
