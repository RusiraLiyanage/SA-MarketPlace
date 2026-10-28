import { Category, Product, ProductImage } from '@sa-marketplace/entities'
import {
  CatalogueProductDetail,
  CategoryOption,
  ProductImageView,
} from './catalogue.typing'

// Optional text: blank is stored as null.
export const blankToNull = (value?: string | null): string | null =>
  value?.trim() || null

export const toCategoryOption = (category: Category): CategoryOption => ({
  id: category.id,
  name: category.name,
})

export const toImageView = (image: ProductImage): ProductImageView => ({
  id: image.id,
  path: image.path,
  altText: image.altText,
  isPrimary: image.isPrimary,
  sortOrder: image.sortOrder,
})

export const toProductDetail = (
  product: Product,
  images: ProductImage[],
): CatalogueProductDetail => ({
  id: product.id,
  name: product.name,
  description: product.description,
  sku: product.sku,
  price: product.price,
  quantity: product.quantity,
  lowStockThreshold: product.lowStockThreshold,
  listingStatus: product.listingStatus,
  categoryId: product.categoryId,
  brand: product.brand,
  manufacturer: product.manufacturer,
  packSize: product.packSize,
  certification: product.certification,
  images: images.map(toImageView),
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
})
