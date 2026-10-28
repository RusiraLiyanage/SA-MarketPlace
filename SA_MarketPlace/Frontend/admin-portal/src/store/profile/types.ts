export type AdminRole = 'buyer' | 'seller' | 'collection_manager' | 'admin'

/** `GET /auth/profile`: the My profile page, and what `PATCH` answers with. */
export interface MyAdminProfile {
  fullName: string
  /** The sign-in address, shown read-only. */
  email: string
  roles: AdminRole[]
  /** Sizes the dots of the current password; the password itself never reaches the browser. */
  passwordLength: number
  /** "Admin since": when the account was created. */
  memberSince: string
  /** Null until the first sign-in is recorded. */
  lastSignInAt: string | null
}

/** Only the name can be changed; the backend rejects an email, a role or a password here (ADR 0028). */
export interface UpdateProfileRequest {
  fullName?: string
}

/** Only the new password: the signed-in session is the proof (backend ADR 0030). */
export interface ChangePasswordRequest {
  newPassword: string
}
