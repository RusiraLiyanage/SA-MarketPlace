import { App } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { MAX_IMAGES, imageProblem } from 'src/pages/ProductForm/productForm'
import type { ProductImage } from 'src/store/catalogue/types'

export interface NewImage {
  file: File
  /** A temporary address for showing the file before it is uploaded. */
  preview: string
}

// The product's pictures while the form is open: the stored ones the seller has not removed, then the files they have added.
// The first is the main image, and the backend allows four in all. The seller can remove and add, not reorder (the API has no
// reorder), so a new file always goes to the end.
export const useProductImages = (stored: ProductImage[]) => {
  const { message } = App.useApp()
  const [removedIds, setRemovedIds] = useState<string[]>([])
  const [added, setAdded] = useState<NewImage[]>([])

  const kept = stored.filter((image) => !removedIds.includes(image.id))
  const count = kept.length + added.length

  // Previews are browser memory: let go of them when the form goes.
  const latest = useRef<NewImage[]>([])
  useEffect(() => {
    latest.current = added
  }, [added])
  useEffect(() => () => latest.current.forEach(({ preview }) => URL.revokeObjectURL(preview)), [])

  const add = (files: File[]) => {
    const accepted: NewImage[] = []
    for (const file of files) {
      const problem = imageProblem(file)
      if (problem) {
        message.error(`${file.name}: ${problem}`)
      } else if (count + accepted.length >= MAX_IMAGES) {
        message.error(`A product can have at most ${MAX_IMAGES} images`)
        break
      } else {
        accepted.push({ file, preview: URL.createObjectURL(file) })
      }
    }
    if (accepted.length > 0) setAdded((current) => [...current, ...accepted])
  }

  const removeStored = (id: string) => setRemovedIds((current) => [...current, id])

  const removeAdded = (index: number) =>
    setAdded((current) => {
      URL.revokeObjectURL(current[index]!.preview)
      return current.filter((_, position) => position !== index)
    })

  return {
    kept,
    added,
    count,
    canAdd: count < MAX_IMAGES,
    removedIds,
    changed: removedIds.length > 0 || added.length > 0,
    add,
    removeStored,
    removeAdded,
  }
}
