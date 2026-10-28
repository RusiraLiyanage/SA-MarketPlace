import type { RegisterRequest } from 'src/store/auth/types'

export const ApplicationStatus = { pendingReview: 'pending_review', rejected: 'rejected', approved: 'approved' } as const
export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus]

/** Where a rejected seller can reach Sample Assist; the phone is null until the backend has one configured. */
export interface SupportContact {
  email: string
  phone: string | null
}

export interface PendingApplication {
  status: typeof ApplicationStatus.pendingReview
  businessName: string
  /** Eleven digits, as the API returns it. */
  abn: string
  submittedAt: string
}

export interface RejectedApplication {
  status: typeof ApplicationStatus.rejected
  businessName: string
  rejectionReason: string | null
  reviewedAt: string | null
  supportContact: SupportContact
}

export interface ApprovedApplication {
  status: typeof ApplicationStatus.approved
  businessName: string
  approvedAt: string | null
  /** True once the seller has dismissed the "you're approved" notice, on any device. */
  acknowledged: boolean
}

/** What `GET /application` answers: one of three shapes, told apart by `status`. */
export type Application = PendingApplication | RejectedApplication | ApprovedApplication

/** What "Update and resubmit" pre-fills the registration form with. */
export interface ApplicationDetails {
  businessName: string
  abn: string
  businessType: string | null
  contactName: string
  phone: string | null
  /** Shown read-only: changing a sign-in email needs a flow that does not exist yet. */
  email: string
}

/** The registration form minus the sign-in details; the backend rejects an email or password here. */
export type ResubmitRequest = Omit<RegisterRequest, 'email' | 'password'>
