import { AppError } from '@sa-marketplace/common'

// Codes must be AppError values: the exception filter turns unknown codes into 500s.
export const CatalogueError = {
  // Also covers another seller's product, so it looks identical to a missing one (ADR 0025).
  PRODUCT_NOT_FOUND: {
    code: AppError.ECB404,
    message: 'Product not found',
  },
  // Retiring is final in Phase 1.
  PRODUCT_RETIRED: {
    code: AppError.ECB409,
    message: 'Retired products cannot be edited',
  },
  // Retiring is final, so a second call is a refusal, not a quiet success.
  PRODUCT_ALREADY_RETIRED: {
    code: AppError.ECB409,
    message: 'This product is already retired',
  },
  // A body field pointing at nothing is a bad request, not a missing page.
  CATEGORY_NOT_FOUND: {
    code: AppError.ECB001,
    message: 'Category not found',
  },
  // Checked from the file's own bytes, not its name or declared type.
  INVALID_IMAGE: {
    code: AppError.ECB001,
    message: 'Images must be JPEG, PNG or WebP',
  },
  TOO_MANY_IMAGES: {
    code: AppError.ECB001,
    message: 'A product can have at most 4 images',
  },
  // An id that is not one of this product's images; never reveals another product's.
  IMAGE_NOT_FOUND: {
    code: AppError.ECB001,
    message: 'One of the images to remove does not belong to this product',
  },
  DESCRIPTION_REQUIRED: {
    code: AppError.ECB001,
    message: 'A description is required to publish',
  },
  // Unique per seller across every listing status, retired included.
  SKU_ALREADY_EXISTS: {
    code: AppError.ECB409,
    message: 'You already have a product with this SKU',
  },
} as const
