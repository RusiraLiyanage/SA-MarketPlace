export const APP_NAME = 'Sample Assist Seller Portal'

export const PAGE_SIZE_OPTIONS = [10, 20, 30] as const

// Where a seller who cannot sign in is sent; the backend's SUPPORT_EMAIL.
export const SUPPORT_EMAIL: string = import.meta.env.VITE_SUPPORT_EMAIL ?? 'partners@sampleassist.com.au'

// The seller's order status chips. "Picking" is left out: it is a screen step, not a stored status, so that filter would
// always be empty (backend ADR 0036). The values are the backend's `status` filter, and "all" sends none.
export const ORDER_STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

// Why a seller can cancel an order they cannot fulfil; the values are the backend's.
export const CANCEL_REASONS = [
  { value: 'out_of_stock', label: 'Out of stock' },
  { value: 'cannot_meet_sla', label: 'Cannot meet dispatch SLA' },
  { value: 'pricing_error', label: 'Pricing error' },
  { value: 'other', label: 'Other' },
] as const

export const CANCEL_NOTES_MAX = 500

// The catalogue's status chips; the values are the backend's `status` filter, and "all" sends none (which includes retired).
export const CATALOGUE_STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'retired', label: 'Retired' },
] as const

// The columns the backend can sort the catalogue by.
export const CATALOGUE_SORT_FIELDS = ['name', 'price', 'quantity'] as const
export const DEFAULT_CATALOGUE_SORT = { orderField: 'name', order: 'ASC' } as const

// Only suggestions: the backend takes any text up to 100 characters, and the seeded sellers' values are free text.
export const BUSINESS_TYPE_OPTIONS = ['Manufacturer', 'Wholesaler', 'Distributor', 'Retailer', 'Private company'].map((value) => ({ value }))
