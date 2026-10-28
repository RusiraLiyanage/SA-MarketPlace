import { SupplierStatus } from '@sa-marketplace/entities'

/** Where a rejected seller can reach Sample Assist ("Contact support"). */
export interface SupportContact {
  email: string
  /** Null until SUPPORT_PHONE is configured — the frontend hides the line. */
  phone: string | null
}

/** Under review: nothing has been decided yet. */
export interface PendingApplicationView {
  status: SupplierStatus.pendingReview
  businessName: string
  abn: string
  submittedAt: Date
}

/** Rejected: the admin's reason, plus how to reach support. */
export interface RejectedApplicationView {
  status: SupplierStatus.rejected
  businessName: string
  /** The admin's reason, shown to the seller. */
  rejectionReason: string | null
  reviewedAt: Date | null
  supportContact: SupportContact
}

/** Approved: `acknowledged` says whether the one-time notice was dismissed. */
export interface ApprovedApplicationView {
  status: SupplierStatus.approved
  businessName: string
  approvedAt: Date | null
  /** True once the seller has dismissed the notice — go straight to the dashboard. */
  acknowledged: boolean
}

/** One of three shapes, told apart by `status`. */
export type ApplicationView =
  | PendingApplicationView
  | RejectedApplicationView
  | ApprovedApplicationView

/** What "Update and resubmit" pre-fills the registration form with. */
export interface ApplicationDetails {
  businessName: string
  abn: string
  businessType: string | null
  contactName: string
  phone: string | null
  /** Shown read-only: changing a sign-in email needs its own flow (CLAUDE.md §9.7). */
  email: string
}
