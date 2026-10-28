// The manual checks an admin makes before approving (Phase 1; ABN lookup automation comes later).
export const VERIFICATION_CHECKS = [
  'ABN is valid and matches the registered business name',
  'Business type and product categories are appropriate for workplace testing',
  'Contact details verified (confirmation email / phone reachable)',
] as const

export const VERIFICATION_STATUS_ID = 'verification-status'
