/** The reasons an admin can pick when rejecting; the reject dropdown offers these. */
export enum RejectionReason {
  abnNotVerified = 'abn_not_verified',
  businessDetailsIncomplete = 'business_details_incomplete',
  notEligibleSupplier = 'not_eligible_supplier',
  other = 'other',
}

/** Stored (with any detail) in `rejectionReason` and shown to the applicant as written. */
export const REJECTION_REASON_LABELS: Record<RejectionReason, string> = {
  [RejectionReason.abnNotVerified]: 'ABN could not be verified',
  [RejectionReason.businessDetailsIncomplete]:
    'Business details are incomplete',
  [RejectionReason.notEligibleSupplier]:
    'Not an eligible supplier for this marketplace',
  [RejectionReason.other]: 'Other',
}
