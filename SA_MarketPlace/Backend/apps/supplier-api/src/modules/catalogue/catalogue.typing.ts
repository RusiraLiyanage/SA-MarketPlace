import { TPagingResDto } from '@sa-marketplace/common'
import { ListingStatus } from '@sa-marketplace/entities'

/** One row of the catalogue table. Edit and Retire act on `id`. */
export interface CatalogueListItem {
  id: string
  name: string
  sku: string
  /** GST-inclusive, kept as a string (ADR 0008). */
  price: string
  /** The seller's sellable stock. */
  quantity: number
  listingStatus: ListingStatus
}

/** A published product at or below its low-stock threshold; drives the warning banner. */
export interface LowStockProduct {
  id: string
  name: string
  quantity: number
}

/** GET /catalogue: one page of rows, plus the low-stock banner, which ignores the filters and paging. */
export interface CatalogueListResponse
  extends TPagingResDto<CatalogueListItem> {
  lowStock: LowStockProduct[]
}

/** One stored image. `path` is relative to the storage root; the apps serve it under /media. */
export interface ProductImageView {
  id: string
  path: string
  altText: string | null
  isPrimary: boolean
  sortOrder: number
}

/** One product as the edit form shows it; also what creating one returns. */
export interface CatalogueProductDetail {
  id: string
  name: string
  description: string | null
  sku: string
  /** GST-inclusive, kept as a string (ADR 0008). */
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
  images: ProductImageView[]
  createdAt: Date
  updatedAt: Date
}

/** A category or sub-category, as a dropdown option. */
export interface CategoryOption {
  id: string
  name: string
}

/** GET /catalogue/categories: top-level categories, each with its sub-categories. */
export interface CategoryTreeItem extends CategoryOption {
  children: CategoryOption[]
}

/** The edit form's product: the detail plus the category split into its two dropdowns. */
export interface CatalogueProductEditView extends CatalogueProductDetail {
  category: CategoryOption
  /** Null when the product sits directly in a top-level category. */
  subCategory: CategoryOption | null
}
