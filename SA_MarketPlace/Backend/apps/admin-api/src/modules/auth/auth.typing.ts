import { UserRoleType } from '@sa-marketplace/entities'

// Never a password or hash, only its length. The email and role are shown, not editable (ADR 0028).
export interface MyAdminProfile {
  fullName: string
  email: string
  roles: UserRoleType[]
  /** Only the length, so the screen can show dots sized to the real password (ADR 0030). */
  passwordLength: number
  /** "Admin since": when the account was created. */
  memberSince: Date
  /** "Last sign-in": null until the first sign-in is recorded. */
  lastSignInAt: Date | null
}
