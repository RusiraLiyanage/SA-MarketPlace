import { ListingStatus, type CategoryTreeItem, type ProductEdit } from 'src/store/catalogue/types'

// The form's text boxes hold text, the stock boxes numbers. What the backend takes is built from these (see `productChanges`).
export interface ProductFormValues {
  name: string
  description: string
  categoryId?: string
  subCategoryId?: string
  sku: string
  packSize: string
  brand: string
  manufacturer: string
  certification: string
  price: string
  quantity: number
  lowStockThreshold: number
}

export const EMPTY_PRODUCT: ProductFormValues = {
  name: '',
  description: '',
  sku: '',
  packSize: '',
  brand: '',
  manufacturer: '',
  certification: '',
  price: '',
  quantity: 0,
  lowStockThreshold: 0,
}

/** The form's starting values: a stored product, or empty boxes for a new one. */
export const toFormValues = (product?: ProductEdit): ProductFormValues =>
  product
    ? {
        name: product.name,
        description: product.description ?? '',
        categoryId: product.category.id,
        subCategoryId: product.subCategory?.id,
        sku: product.sku,
        packSize: product.packSize ?? '',
        brand: product.brand ?? '',
        manufacturer: product.manufacturer ?? '',
        certification: product.certification ?? '',
        price: product.price,
        quantity: product.quantity,
        lowStockThreshold: product.lowStockThreshold,
      }
    : EMPTY_PRODUCT

/** The backend takes the sub-category if one is chosen, else the category. */
export const chosenCategoryId = ({ categoryId, subCategoryId }: Pick<ProductFormValues, 'categoryId' | 'subCategoryId'>) =>
  subCategoryId ?? categoryId

/** The sub-categories of the chosen category; none until a category is chosen. */
export const subCategoriesOf = (categories: CategoryTreeItem[], categoryId?: string) =>
  categories.find((category) => category.id === categoryId)?.children ?? []

const OPTIONAL_TEXT = ['packSize', 'brand', 'manufacturer', 'certification'] as const

// The same text to the backend, which trims and treats blank as "none".
const text = (value: string | null | undefined) => (value ?? '').trim()

/** Every field, as the strings a multipart body carries. Blank optional fields are left out (on create blank means "not sent"). */
export const productFields = (values: ProductFormValues): Record<string, string> => {
  const fields: Record<string, string> = {
    name: text(values.name),
    sku: text(values.sku),
    price: text(values.price),
    categoryId: chosenCategoryId(values) ?? '',
    quantity: String(values.quantity ?? 0),
    lowStockThreshold: String(values.lowStockThreshold ?? 0),
  }
  if (text(values.description)) fields.description = text(values.description)
  for (const key of OPTIONAL_TEXT) if (text(values[key])) fields[key] = text(values[key])
  return fields
}

/**
 * Only what differs from the stored product. The backend leaves out-of-sight fields as they were, so a stock count that
 * sold since the form opened is not overwritten by an edit of the name. A text box emptied on purpose is sent blank, which
 * clears it. Prices compare as numbers, so "89" against a stored "89.00" is no change.
 */
export const productChanges = (original: ProductEdit, values: ProductFormValues): Record<string, string> => {
  const changes: Record<string, string> = {}
  const next = productFields(values)

  if (next.name !== original.name) changes.name = next.name
  if (next.sku !== original.sku) changes.sku = next.sku
  if (Number(next.price) !== Number(original.price)) changes.price = next.price
  if (next.categoryId !== original.categoryId) changes.categoryId = next.categoryId
  if (values.quantity !== original.quantity) changes.quantity = next.quantity
  if (values.lowStockThreshold !== original.lowStockThreshold) changes.lowStockThreshold = next.lowStockThreshold
  if ((next.description ?? '') !== (original.description ?? '')) changes.description = next.description ?? ''
  for (const key of OPTIONAL_TEXT) {
    if ((next[key] ?? '') !== (original[key] ?? '')) changes[key] = next[key] ?? ''
  }
  return changes
}

export interface ProductFormParts {
  fields: Record<string, string>
  /** Set on Save draft and Publish; left out when the status is not changing. */
  listingStatus?: ListingStatus
  /** New images, in display order after the ones kept. */
  newImages?: File[]
  /** Stored images to delete. */
  removeImageIds?: string[]
}

/** The multipart body for creating or editing a product. */
export const productFormData = ({ fields, listingStatus, newImages = [], removeImageIds = [] }: ProductFormParts): FormData => {
  const body = new FormData()
  for (const [key, value] of Object.entries(fields)) body.append(key, value)
  if (listingStatus) body.append('listingStatus', listingStatus)
  for (const id of removeImageIds) body.append('removeImageIds', id)
  for (const file of newImages) body.append('images', file)
  return body
}

export const MAX_IMAGES = 4
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** Null when the file is one the backend would take; the browser's own check, so a bad file is refused before it is sent. */
export const imageProblem = (file: Pick<File, 'type' | 'size'>): string | null => {
  if (!IMAGE_TYPES.includes(file.type)) return 'Images must be JPEG, PNG or WebP'
  if (file.size > MAX_IMAGE_BYTES) return 'Each image must be 5 MB or smaller'
  return null
}

/** What the status buttons say, and what saving them does to a product's listing. */
export const publishLabel = (status?: ListingStatus) => (status === ListingStatus.published ? 'Save changes' : 'Publish')

const blank = (value: string | null | undefined) => text(value) === ''

/**
 * Whether the form holds anything the seller has not saved: a difference from the stored product, or for a new product any
 * box filled in. New pictures and removed ones count too (`imagesChanged`).
 */
export const hasUnsavedProductChanges = (original: ProductEdit | undefined, values: ProductFormValues, imagesChanged: boolean): boolean => {
  if (imagesChanged) return true
  if (original) return Object.keys(productChanges(original, values)).length > 0
  return (
    !blank(values.name) ||
    !blank(values.description) ||
    !blank(values.sku) ||
    !blank(values.price) ||
    OPTIONAL_TEXT.some((key) => !blank(values[key])) ||
    values.categoryId !== undefined ||
    (values.quantity ?? 0) !== 0 ||
    (values.lowStockThreshold ?? 0) !== 0
  )
}
