import type { BusinessProfile, UpdateProfileRequest } from 'src/store/profile/types'

// The editable boxes of the Business profile. Business name, ABN, email and the categories are shown but not editable.
export interface ProfileFormValues {
  businessType: string
  contactName: string
  phone: string
  dispatchSlaHours: number
  defaultCarrier: string
}

export const toProfileFormValues = ({ business, contact, fulfilment }: BusinessProfile): ProfileFormValues => ({
  businessType: business.businessType ?? '',
  contactName: contact.contactName,
  phone: contact.phone ?? '',
  dispatchSlaHours: fulfilment.dispatchSlaHours,
  defaultCarrier: fulfilment.defaultCarrier ?? '',
})

/**
 * Only what the seller actually changed, so a save never rewrites a field they did not touch. A text box emptied on purpose
 * (business type, default carrier) is sent blank, which clears it; a phone cannot be cleared, so it is only sent when set.
 */
export const profileChanges = (profile: BusinessProfile, values: ProfileFormValues): UpdateProfileRequest => {
  const before = toProfileFormValues(profile)
  const businessType = values.businessType.trim()
  const contactName = values.contactName.trim()
  const phone = values.phone.trim()
  const defaultCarrier = values.defaultCarrier.trim()

  return {
    ...(businessType !== before.businessType && { businessType }),
    ...(contactName !== before.contactName && { contactName }),
    ...(phone && phone !== before.phone && { phone }),
    ...(values.dispatchSlaHours !== before.dispatchSlaHours && { dispatchSlaHours: values.dispatchSlaHours }),
    ...(defaultCarrier !== before.defaultCarrier && { defaultCarrier }),
  }
}
