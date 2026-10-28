import { SupplierStatus } from '@sa-marketplace/entities'

/** One row of the supplier verification table. Review and View link to the application by `id`. */
export interface SupplierApplicationListItem {
  /** The supplier profile's id, which the application screen and the decision routes use. */
  id: string
  businessName: string
  /** The 11 digits as stored; the screen spaces them. */
  abn: string
  contactName: string
  contactEmail: string
  /** When it was last submitted; "Waiting N days" is worked out from it. */
  submittedAt: Date
  status: SupplierStatus
  /** When an admin decided it; null while pending. */
  reviewedAt: Date | null
  /** Why it was rejected; null otherwise. */
  rejectionReason: string | null
}

/** What the tabs, the banner and the sidebar badge show; none of it changes with a filter or a page. */
export interface SupplierApplicationCounts {
  all: number
  pendingReview: number
  approved: number
  rejected: number
}

/** The application screen. Review (pending) and View (decided) both load this; the buttons enable only while `status` is pending_review. */
export interface SupplierApplicationDetail {
  id: string
  businessName: string
  /** The 11 digits as stored; the screen spaces them. */
  abn: string
  businessType: string | null
  contactName: string
  contactEmail: string
  contactPhone: string | null
  /** Worked out from the supplier's products (ADR 0040); empty while pending, as there are none yet. */
  productCategories: string[]
  status: SupplierStatus
  submittedAt: Date
  /** When an admin decided it; null while pending. */
  reviewedAt: Date | null
  /** Why it was rejected, as the applicant sees it; null otherwise. */
  rejectionReason: string | null
  /** The admin who approved or rejected it; null while pending. */
  reviewedByName: string | null
}
