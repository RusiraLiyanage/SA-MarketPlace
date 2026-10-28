import { ListingStatus, Product, ProductImage } from '@sa-marketplace/entities'
import { blankToNull, toProductDetail } from './catalogue.mapper'

describe('blankToNull', () => {
  it.each([
    [undefined, null],
    [null, null],
    ['', null],
    ['   ', null],
    ['Bindi', 'Bindi'],
    ['  Bindi  ', 'Bindi'],
  ])('maps %p to %p', (input, expected) => {
    expect(blankToNull(input)).toBe(expected)
  })
})

describe('toProductDetail', () => {
  const now = new Date('2026-10-05T00:00:00.000Z')
  const product = {
    id: 'p1',
    name: 'Kit',
    description: null,
    sku: 'K-1',
    price: '9.50',
    quantity: 3,
    lowStockThreshold: 1,
    listingStatus: ListingStatus.draft,
    categoryId: 'c1',
    brand: null,
    manufacturer: null,
    packSize: null,
    certification: null,
    createdAt: now,
    updatedAt: now,
    // Not part of the response:
    supplierProfileId: 'secret-profile',
    storageConditions: 'cool',
  } as unknown as Product

  const image = (id: string, sortOrder: number) =>
    ({
      id,
      productId: 'p1',
      path: `products/${id}.jpg`,
      altText: 'Kit',
      isPrimary: sortOrder === 0,
      sortOrder,
    } as ProductImage)

  it('keeps the images in the order given and exposes only the response fields', () => {
    const detail = toProductDetail(product, [image('a', 0), image('b', 1)])

    expect(detail.images.map((i) => i.id)).toEqual(['a', 'b'])
    expect(detail.images[0]).toEqual({
      id: 'a',
      path: 'products/a.jpg',
      altText: 'Kit',
      isPrimary: true,
      sortOrder: 0,
    })
    expect(detail).not.toHaveProperty('supplierProfileId')
    expect(detail).not.toHaveProperty('storageConditions')
    expect(detail.price).toBe('9.50')
  })
})
