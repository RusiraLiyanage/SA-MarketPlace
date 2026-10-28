import { describe, expect, it } from 'vitest'
import {
  EMPTY_PRODUCT,
  chosenCategoryId,
  imageProblem,
  productChanges,
  productFields,
  productFormData,
  publishLabel,
  subCategoriesOf,
  toFormValues,
} from 'src/pages/ProductForm/productForm'
import type { CategoryTreeItem, ProductEdit } from 'src/store/catalogue/types'

const product: ProductEdit = {
  id: 'p1',
  name: 'Hair Follicle Test Kit',
  description: 'Collection kit',
  sku: 'HFT-003',
  price: '89.00',
  quantity: 12,
  lowStockThreshold: 20,
  listingStatus: 'published',
  categoryId: 'sub1',
  brand: 'Bindi MedSupply',
  manufacturer: null,
  packSize: '1 unit',
  certification: null,
  images: [],
  category: { id: 'cat1', name: 'Collection Kits' },
  subCategory: { id: 'sub1', name: 'Hair Testing' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const tree: CategoryTreeItem[] = [
  { id: 'cat1', name: 'Collection Kits', children: [{ id: 'sub1', name: 'Hair Testing' }] },
  { id: 'cat2', name: 'Supplies', children: [] },
]

describe('toFormValues', () => {
  it('starts a new product empty, with no stock', () => {
    expect(toFormValues()).toEqual(EMPTY_PRODUCT)
    expect(EMPTY_PRODUCT.quantity).toBe(0)
  })

  it('splits a stored product into its category and sub-category, and turns missing text into empty boxes', () => {
    expect(toFormValues(product)).toMatchObject({ categoryId: 'cat1', subCategoryId: 'sub1', manufacturer: '', certification: '', price: '89.00' })
  })
})

describe('categories', () => {
  it('uses the sub-category when one is chosen, else the category', () => {
    expect(chosenCategoryId({ categoryId: 'cat1', subCategoryId: 'sub1' })).toBe('sub1')
    expect(chosenCategoryId({ categoryId: 'cat2' })).toBe('cat2')
  })

  it('offers the sub-categories of the chosen category, and none before a choice', () => {
    expect(subCategoriesOf(tree, 'cat1')).toEqual([{ id: 'sub1', name: 'Hair Testing' }])
    expect(subCategoriesOf(tree, 'cat2')).toEqual([])
    expect(subCategoriesOf(tree)).toEqual([])
  })
})

describe('productFields', () => {
  it('trims, sends the chosen category and leaves blank optional fields out', () => {
    expect(
      productFields({ ...EMPTY_PRODUCT, name: '  Kit ', sku: ' K-1 ', price: ' 9.5 ', categoryId: 'cat1', subCategoryId: 'sub1', brand: ' Bindi ', quantity: 3 }),
    ).toEqual({ name: 'Kit', sku: 'K-1', price: '9.5', categoryId: 'sub1', quantity: '3', lowStockThreshold: '0', brand: 'Bindi' })
  })
})

describe('productChanges', () => {
  const same = toFormValues(product)

  it('is nothing when nothing changed', () => {
    expect(productChanges(product, same)).toEqual({})
  })

  it('sends only the field that changed, so stock that sold meanwhile is never overwritten', () => {
    expect(productChanges(product, { ...same, name: 'Hair Kit' })).toEqual({ name: 'Hair Kit' })
  })

  it('treats a price written differently ("89") as no change, and a real change as one', () => {
    expect(productChanges(product, { ...same, price: '89' })).toEqual({})
    expect(productChanges(product, { ...same, price: '95.5' })).toEqual({ price: '95.5' })
  })

  it('sends stock and the threshold as strings, and the new category when it changes', () => {
    expect(productChanges(product, { ...same, quantity: 0, lowStockThreshold: 5, categoryId: 'cat2', subCategoryId: undefined })).toEqual({
      quantity: '0',
      lowStockThreshold: '5',
      categoryId: 'cat2',
    })
  })

  it('sends a blank for a text box emptied on purpose, which clears it, and not for one that was always empty', () => {
    expect(productChanges(product, { ...same, brand: '', description: '' })).toEqual({ brand: '', description: '' })
    expect(productChanges(product, { ...same, manufacturer: '' })).toEqual({})
  })

  it('ignores spaces around text', () => {
    expect(productChanges(product, { ...same, name: '  Hair Follicle Test Kit  ' })).toEqual({})
  })
})

describe('productFormData', () => {
  const file = (name: string) => new File(['x'], name, { type: 'image/png' })

  it('carries the fields, the status, the images and the ids to remove', () => {
    const body = productFormData({
      fields: { name: 'Kit', price: '9' },
      listingStatus: 'published',
      newImages: [file('a.png'), file('b.png')],
      removeImageIds: ['i1', 'i2'],
    })

    expect(body.get('name')).toBe('Kit')
    expect(body.get('price')).toBe('9')
    expect(body.get('listingStatus')).toBe('published')
    expect(body.getAll('removeImageIds')).toEqual(['i1', 'i2'])
    expect(body.getAll('images').map((f) => (f as File).name)).toEqual(['a.png', 'b.png'])
  })

  it('leaves out a status that is not changing, and sends a blank field as blank', () => {
    const body = productFormData({ fields: { brand: '' } })

    expect(body.has('listingStatus')).toBe(false)
    expect(body.get('brand')).toBe('')
    expect(body.has('images')).toBe(false)
  })
})

describe('imageProblem', () => {
  it('accepts JPEG, PNG and WebP up to 5 MB', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) expect(imageProblem({ type, size: 1000 })).toBeNull()
    expect(imageProblem({ type: 'image/png', size: 5 * 1024 * 1024 })).toBeNull()
  })

  it('refuses another type or a larger file, with the backend\'s wording', () => {
    expect(imageProblem({ type: 'image/gif', size: 10 })).toBe('Images must be JPEG, PNG or WebP')
    expect(imageProblem({ type: 'application/pdf', size: 10 })).toBe('Images must be JPEG, PNG or WebP')
    expect(imageProblem({ type: 'image/png', size: 5 * 1024 * 1024 + 1 })).toBe('Each image must be 5 MB or smaller')
  })
})

describe('publishLabel', () => {
  it('says Publish until the product is published, then Save changes', () => {
    expect(publishLabel()).toBe('Publish')
    expect(publishLabel('draft')).toBe('Publish')
    expect(publishLabel('published')).toBe('Save changes')
  })
})
