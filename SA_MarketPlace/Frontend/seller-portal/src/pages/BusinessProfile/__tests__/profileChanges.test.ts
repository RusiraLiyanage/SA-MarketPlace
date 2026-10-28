import { describe, expect, it } from 'vitest'
import { profileChanges, toProfileFormValues } from 'src/pages/BusinessProfile/profileChanges'
import type { BusinessProfile } from 'src/store/profile/types'

const profile: BusinessProfile = {
  business: { businessName: 'Bindi MedSupply Pty Ltd', abn: '51824753556', businessType: 'Wholesaler' },
  contact: { contactName: 'Priya Nair', phone: '0412 000 002' },
  productCategories: ['Collection Kits'],
  email: 'priya@bindimedsupply.com.au',
  passwordLength: 12,
  fulfilment: { dispatchSlaHours: 24, defaultCarrier: 'Australia Post' },
  verification: { status: 'approved', approvedAt: '2026-06-02T03:00:00.000Z' },
}

describe('toProfileFormValues', () => {
  it('turns what is stored into the boxes, and a missing value into an empty box', () => {
    expect(toProfileFormValues(profile)).toEqual({
      businessType: 'Wholesaler',
      contactName: 'Priya Nair',
      phone: '0412 000 002',
      dispatchSlaHours: 24,
      defaultCarrier: 'Australia Post',
    })
    expect(
      toProfileFormValues({ ...profile, business: { ...profile.business, businessType: null }, contact: { ...profile.contact, phone: null }, fulfilment: { dispatchSlaHours: 48, defaultCarrier: null } }),
    ).toMatchObject({ businessType: '', phone: '', defaultCarrier: '' })
  })
})

describe('profileChanges', () => {
  const same = toProfileFormValues(profile)

  it('is nothing when nothing changed', () => {
    expect(profileChanges(profile, same)).toEqual({})
  })

  it('sends only the field that changed', () => {
    expect(profileChanges(profile, { ...same, dispatchSlaHours: 48 })).toEqual({ dispatchSlaHours: 48 })
    expect(profileChanges(profile, { ...same, contactName: '  Priya Q Nair ' })).toEqual({ contactName: 'Priya Q Nair' })
  })

  it('ignores spaces around text', () => {
    expect(profileChanges(profile, { ...same, defaultCarrier: ' Australia Post ', phone: ' 0412 000 002 ' })).toEqual({})
  })

  it('sends a blank for a business type or carrier emptied on purpose, which clears it', () => {
    expect(profileChanges(profile, { ...same, businessType: '', defaultCarrier: '  ' })).toEqual({ businessType: '', defaultCarrier: '' })
  })

  it('does not send a blank phone, which the backend cannot clear', () => {
    expect(profileChanges(profile, { ...same, phone: '' })).toEqual({})
  })

  it('sends several changes together', () => {
    expect(profileChanges(profile, { ...same, businessType: 'Distributor', phone: '0411 222 333', defaultCarrier: 'Sendle' })).toEqual({
      businessType: 'Distributor',
      phone: '0411 222 333',
      defaultCarrier: 'Sendle',
    })
  })
})
