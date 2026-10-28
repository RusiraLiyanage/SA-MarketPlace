// The signed-in state: the token, and why it is gone when it is.
export type SessionEnd = 'expired' | 'signedOut'

export interface AuthState {
  token: string | null
  /** The backend rejected the token, or the admin signed out. Null on a fresh visit. */
  endedBy: SessionEnd | null
}

// What the backend takes and returns for sign-in, registration and password resets.
export interface LoginRequest {
  email: string
  password: string
}

/** The backend rejects fields it does not know, so the form's confirm-password box is not part of this. */
export interface RegisterRequest {
  /** A full name; the backend splits it on the last space. */
  fullName: string
  /** Only an address at an allowed Sample Assist domain is accepted (backend ADR 0038). */
  email: string
  password: string
  acceptTerms: true
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
