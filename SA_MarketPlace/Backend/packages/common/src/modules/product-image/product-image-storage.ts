import * as path from 'path'
import { STORAGE_ROOT } from '../storage/storage-root'

/** Where product images live, and what the apps serve statically. */
export const PRODUCT_IMAGE_DIR = path.join(STORAGE_ROOT, 'products')

// product_image.path is stored relative ("products/<random>.jpg"), like invoice.pdf_path.
export const relativeProductImagePath = (filename: string): string =>
  path.join('products', filename)

export const resolveProductImagePath = (relativePath: string): string =>
  path.join(STORAGE_ROOT, relativePath)

/** Both apps serve PRODUCT_IMAGE_DIR here; the URL of an image is `/media/` + its stored path. */
export const PRODUCT_IMAGE_URL_PREFIX = '/media/products'
