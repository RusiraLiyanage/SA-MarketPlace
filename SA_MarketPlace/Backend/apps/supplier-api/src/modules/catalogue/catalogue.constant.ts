export const PRODUCT_IMAGE_LIMITS = {
  /** The four slots on the Add product form. */
  MAX_COUNT: 4,
  MAX_BYTES: 5 * 1024 * 1024,
} as const

/** Accepted image types, and the extension each is stored with. */
export const PRODUCT_IMAGE_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const
