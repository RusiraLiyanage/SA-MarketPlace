// The only fields the backend lets a buyer change (backend ADR 0028): the email and organisation are fixed.
export interface UpdateProfileRequest {
  firstName?: string
  lastName?: string
  phone?: string
}

/** No current password and no confirm field: the signed-in session is the proof, and matching is checked in the browser. */
export interface ChangePasswordRequest {
  newPassword: string
}
