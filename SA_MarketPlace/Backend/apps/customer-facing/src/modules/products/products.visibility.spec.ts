import {
  ListingStatus,
  Product,
  SupplierProfile,
  SupplierStatus,
} from '@sa-marketplace/entities'
import { isProductOrderable } from './products.visibility'

const product = (
  listingStatus: ListingStatus,
  supplierStatus: SupplierStatus,
): Product =>
  ({
    listingStatus,
    supplierProfile: { status: supplierStatus } as SupplierProfile,
  } as Product)

describe('isProductOrderable', () => {
  it('is orderable when published and the supplier is approved', () => {
    expect(
      isProductOrderable(
        product(ListingStatus.published, SupplierStatus.approved),
      ),
    ).toBe(true)
  })

  it('is not orderable when draft', () => {
    expect(
      isProductOrderable(product(ListingStatus.draft, SupplierStatus.approved)),
    ).toBe(false)
  })

  it('is not orderable when retired', () => {
    expect(
      isProductOrderable(
        product(ListingStatus.retired, SupplierStatus.approved),
      ),
    ).toBe(false)
  })

  it('is not orderable when the supplier is pending review', () => {
    expect(
      isProductOrderable(
        product(ListingStatus.published, SupplierStatus.pendingReview),
      ),
    ).toBe(false)
  })

  it('is not orderable when the supplier is rejected', () => {
    expect(
      isProductOrderable(
        product(ListingStatus.published, SupplierStatus.rejected),
      ),
    ).toBe(false)
  })
})
