// The signed-in state: the token, and why it is gone when it is.
export type SessionEnd = 'expired' | 'signedOut'

export interface AuthState {
  token: string | null
  /** The backend rejected the token, or the buyer signed out. Null on a fresh visit. */
  endedBy: SessionEnd | null
}

// What the backend takes and returns for sign-in, registration and password resets.
export interface LoginRequest {
  email: string
  password: string
}

/** The backend rejects fields it does not know, so the form's confirm-password box is not part of this. */
export interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  organisation: string
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
