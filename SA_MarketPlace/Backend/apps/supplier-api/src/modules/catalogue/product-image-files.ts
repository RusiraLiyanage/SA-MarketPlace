import { promises as fs } from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'
import {
  PRODUCT_IMAGE_DIR,
  relativeProductImagePath,
} from '@sa-marketplace/common'

export interface StoredImage {
  filename: string
  /** Relative to the storage root, as product_image.path keeps it. */
  path: string
}

// Random names, so a draft's image cannot be found by guessing. Sequential; any failure
// removes the files this call already wrote before rethrowing.
export const writeProductImageFiles = async (
  images: { buffer: Buffer; extension: string }[],
  dir: string = PRODUCT_IMAGE_DIR,
): Promise<StoredImage[]> => {
  if (images.length === 0) return []
  await fs.mkdir(dir, { recursive: true })

  const stored: StoredImage[] = []
  try {
    for (const image of images) {
      const filename = `${randomUUID()}.${image.extension}`
      await fs.writeFile(path.join(dir, filename), image.buffer, { flag: 'wx' })
      stored.push({ filename, path: relativeProductImagePath(filename) })
    }
  } catch (error) {
    await removeProductImageFiles(stored, dir)
    throw error
  }
  return stored
}

// Best effort: a file that cannot be removed must not hide the error that got us here.
export const removeProductImageFiles = async (
  stored: StoredImage[],
  dir: string = PRODUCT_IMAGE_DIR,
): Promise<void> => {
  await Promise.allSettled(
    stored.map((file) => fs.rm(path.join(dir, file.filename), { force: true })),
  )
}
