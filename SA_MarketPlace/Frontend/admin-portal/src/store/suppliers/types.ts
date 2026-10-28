export const SupplierStatus = { pendingReview: 'pending_review', approved: 'approved', rejected: 'rejected' } as const
export type SupplierStatus = (typeof SupplierStatus)[keyof typeof SupplierStatus]

/** One row of the supplier verification table. Review and View open the application by `id`. */
export interface SupplierApplicationListItem {
  /** The supplier profile's id, which the application screen and the decision routes use. */
  id: string
  businessName: string
  /** The eleven digits as stored; the screen spaces them. */
  abn: string
  contactName: string
  contactEmail: string
  /** When it was last submitted; "Waiting N days" is worked out from it. */
  submittedAt: string
  status: SupplierStatus
  /** When an admin decided it; null while pending. */
  reviewedAt: string | null
  /** Why it was rejected, as the applicant sees it; null otherwise. */
  rejectionReason: string | null
}

/** What the tabs, the banner and the sidebar badge show; none of it changes with a filter or a page. */
export interface SupplierApplicationCounts {
  all: number
  pendingReview: number
  approved: number
  rejected: number
}

export interface ListSuppliersRequest {
  page: number
  limit: number
  /** Left out for All. */
  status?: SupplierStatus
  /** Matched against the business name, or the ABN with or without spaces. */
  search?: string
}

/** The application screen. Review (pending) and View (decided) both load this; the decision buttons work only while `status` is pending_review. */
export interface SupplierApplicationDetail {
  id: string
  businessName: string
  /** The eleven digits as stored; the screen spaces them. */
  abn: string
  businessType: string | null
  contactName: string
  contactEmail: string
  contactPhone: string | null
  /** Worked out from the supplier's products (backend ADR 0040); empty while pending, as there are none yet. */
  productCategories: string[]
  status: SupplierStatus
  submittedAt: string
  /** When an admin decided it; null while pending. */
  reviewedAt: string | null
  /** Why it was rejected, as the applicant sees it; null otherwise. */
  rejectionReason: string | null
  /** The admin who approved or rejected it; null while pending. */
  reviewedByName: string | null
}

export type RejectionReason = 'abn_not_verified' | 'business_details_incomplete' | 'not_eligible_supplier' | 'other'

export interface RejectSupplierRequest {
  supplierId: string
  reason: RejectionReason
  /** Explains what to fix; required when the reason is "other". */
  detail?: string
}
