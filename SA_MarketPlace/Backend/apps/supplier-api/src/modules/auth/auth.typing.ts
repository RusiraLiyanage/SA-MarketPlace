import { SupplierStatus } from '@sa-marketplace/entities'

// Never a password or hash, only its length. Identity fields (business name, ABN, email) are shown, not editable.
export interface MyBusinessProfile {
  business: {
    businessName: string
    abn: string
    businessType: string | null
  }
  contact: {
    contactName: string
    phone: string | null
  }
  /** Worked out from the seller's products, read-only (ADR 0040); empty until they list one. */
  productCategories: string[]
  email: string
  /** Only the length, so the screen can show dots sized to the real password (ADR 0030). */
  passwordLength: number
  fulfilment: {
    dispatchSlaHours: number
    defaultCarrier: string | null
  }
  /** The "Verified supplier" line: when Sample Assist approved the business. */
  verification: {
    status: SupplierStatus
    approvedAt: Date | null
  }
}
