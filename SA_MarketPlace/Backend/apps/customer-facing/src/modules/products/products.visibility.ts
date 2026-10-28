import {
  ListingStatus,
  Product,
  SupplierStatus,
} from '@sa-marketplace/entities'

// The one rule for whether a buyer may see or order a product (CLAUDE.md §5): published, approved supplier.
export const isProductOrderable = (product: Product): boolean =>
  product.listingStatus === ListingStatus.published &&
  product.supplierProfile.status === SupplierStatus.approved
