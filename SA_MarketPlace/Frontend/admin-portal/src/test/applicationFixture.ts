import type { SupplierApplicationDetail } from 'src/store/suppliers/types'

export const application = (overrides: Partial<SupplierApplicationDetail> = {}): SupplierApplicationDetail => ({
  id: 'sup-1',
  businessName: 'Bindi MedSupply Pty Ltd',
  abn: '51824753556',
  businessType: 'Private company',
  contactName: 'Priya Nair',
  contactEmail: 'priya@bindimedsupply.com.au',
  contactPhone: '+61 2 8000 1234',
  productCategories: [],
  status: 'pending_review',
  submittedAt: '2026-07-25T02:00:00.000Z',
  reviewedAt: null,
  rejectionReason: null,
  reviewedByName: null,
  ...overrides,
})
