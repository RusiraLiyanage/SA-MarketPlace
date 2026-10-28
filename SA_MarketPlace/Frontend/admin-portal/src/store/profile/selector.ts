import type { AdminRole } from 'src/store/profile/types'

const ROLE_LABELS: Record<AdminRole, string> = {
  admin: 'Administrator',
  seller: 'Seller',
  buyer: 'Buyer',
  collection_manager: 'Collection Manager',
}

/** "Administrator", or every role the account holds when it holds more than one. */
export const roleLabels = (roles: AdminRole[]): string => roles.map((role) => ROLE_LABELS[role]).join(', ')
