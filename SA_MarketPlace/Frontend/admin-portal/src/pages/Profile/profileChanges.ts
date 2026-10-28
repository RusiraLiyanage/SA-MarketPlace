import type { UpdateProfileRequest } from 'src/store/profile/types'

export interface PersonalDetailsValues {
  fullName: string
}

/** Only what the admin actually changed: the name is the one thing the backend lets them edit, and spaces around it do not count. */
export const profileChanges = (profile: { fullName: string }, values: PersonalDetailsValues): UpdateProfileRequest => {
  const fullName = values.fullName.trim()
  return fullName !== profile.fullName ? { fullName } : {}
}
