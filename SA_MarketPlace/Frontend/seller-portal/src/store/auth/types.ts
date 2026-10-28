// The signed-in state: the token, and why it is gone when it is.
export type SessionEnd = 'expired' | 'signedOut'

export interface AuthState {
  token: string | null
  /** The backend rejected the token, or the seller signed out. Null on a fresh visit. */
  endedBy: SessionEnd | null
}

// What the backend takes and returns for sign-in, registration and password resets.
export interface LoginRequest {
  email: string
  password: string
}

/** The backend rejects fields it does not know, so the form's confirm-password box and the digits-only ABN rule are not part of this. */
export interface RegisterRequest {
  businessName: string
  /** Eleven digits, no spaces. */
  abn: string
  businessType?: string
  /** A full name; the backend splits it on the last space. */
  contactName: string
  email: string
  password: string
  phone: string
  confirmAuthorised: true
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  password: string
}

export interface TokenResponse {
  access_token: string
}
