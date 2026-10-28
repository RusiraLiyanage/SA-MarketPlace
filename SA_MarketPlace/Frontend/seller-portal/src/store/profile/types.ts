/** `GET /auth/profile`: the Business profile screen, and what `PATCH` answers with. */
export interface BusinessProfile {
  business: {
    businessName: string
    /** Eleven digits. */
    abn: string
    businessType: string | null
  }
  contact: {
    contactName: string
    phone: string | null
  }
  /** Worked out from the seller's products (backend ADR 0040); not editable. */
  productCategories: string[]
  /** The sign-in address, shown read-only. */
  email: string
  /** Sizes the dots of the current password; the password itself never reaches the browser. */
  passwordLength: number
  fulfilment: {
    /** Whole hours, 1 to 168: how long a seller has to dispatch an order after it is placed. */
    dispatchSlaHours: number
    defaultCarrier: string | null
  }
  verification: {
    status: string
    approvedAt: string | null
  }
}

/** Only what changed. Business name, ABN and email are not editable: the backend answers 400 if they are sent. */
export interface UpdateProfileRequest {
  /** Blank clears it. */
  businessType?: string
  contactName?: string
  phone?: string
  dispatchSlaHours?: number
  /** Blank clears it. */
  defaultCarrier?: string
}

/** Only the new password: the signed-in session is the proof (backend ADR 0030). */
export interface ChangePasswordRequest {
  newPassword: string
}
