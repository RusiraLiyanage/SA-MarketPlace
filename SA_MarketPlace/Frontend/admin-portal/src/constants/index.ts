export const APP_NAME = 'Sample Assist Admin'

export const PAGE_SIZE_OPTIONS = [10, 20, 30] as const

// The supplier queue's status chips. The values are the backend's `status` filter, and "all" sends none. Pending review is what an
// admin comes here for, so it is the one shown when the address names none.
export const SUPPLIER_STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
] as const
export const DEFAULT_SUPPLIER_FILTER = 'pending_review'

// Why an admin can reject an application; the values and wording are the backend's, and "Other" needs a detail.
export const REJECTION_REASONS = [
  { value: 'abn_not_verified', label: 'ABN could not be verified' },
  { value: 'business_details_incomplete', label: 'Business details are incomplete' },
  { value: 'not_eligible_supplier', label: 'Not an eligible supplier for this marketplace' },
  { value: 'other', label: 'Other' },
] as const

export const REJECTION_DETAIL_MAX = 1000

// The orders list's filters. The values are the backend's `payment` and `fulfilment` filters, and "all" sends none.
export const PAYMENT_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
] as const

export const FULFILMENT_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'received', label: 'Received' },
  { value: 'picking', label: 'Picking' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

// The columns the backend can sort orders by; newest first is its default.
export const ORDER_SORT_FIELDS = ['placed_at', 'total', 'order_number'] as const
export const DEFAULT_ORDER_SORT = { orderField: 'placed_at', order: 'DESC' } as const
