import type { PersonalDetailsValues } from 'src/pages/Profile/components/PersonalDetailsForm'
import type { UpdateProfileRequest } from 'src/store/profile/types'
import type { MyProfile } from 'src/types'

// Only what the buyer actually changed is sent, so a save never rewrites a field they did not touch. A blank phone is
// left out because the backend can set a number but not clear it.
export const profileChanges = (
  profile: Pick<MyProfile, 'firstName' | 'lastName' | 'phone'>,
  values: PersonalDetailsValues,
): UpdateProfileRequest => {
  const firstName = values.firstName.trim()
  const lastName = values.lastName.trim()
  const phone = values.phone.trim()

  return {
    ...(firstName !== profile.firstName && { firstName }),
    ...(lastName !== profile.lastName && { lastName }),
    ...(phone && phone !== profile.phone && { phone }),
  }
}
