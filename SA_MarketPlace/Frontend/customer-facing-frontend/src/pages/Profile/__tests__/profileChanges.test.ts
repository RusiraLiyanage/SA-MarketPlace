import { describe, expect, it } from 'vitest'
import { profileChanges } from 'src/pages/Profile/profileChanges'

const profile = { firstName: 'Jordan', lastName: 'Shaw', phone: '+61 2 9000 5678' }
const same = { firstName: 'Jordan', lastName: 'Shaw', phone: '+61 2 9000 5678' }

describe('profileChanges', () => {
  it('is empty when nothing differs', () => {
    expect(profileChanges(profile, same)).toEqual({})
  })

  it('includes only the fields that changed, trimmed', () => {
    expect(profileChanges(profile, { ...same, lastName: '  Shaw-Lee ', phone: '0412 000 111' })).toEqual({
      lastName: 'Shaw-Lee',
      phone: '0412 000 111',
    })
  })

  it('leaves out a blank phone, which the backend cannot clear', () => {
    expect(profileChanges(profile, { ...same, phone: '  ' })).toEqual({})
  })

  it('can set a first phone number', () => {
    expect(profileChanges({ ...profile, phone: null }, { ...same, phone: '0412 000 111' })).toEqual({ phone: '0412 000 111' })
  })
})
