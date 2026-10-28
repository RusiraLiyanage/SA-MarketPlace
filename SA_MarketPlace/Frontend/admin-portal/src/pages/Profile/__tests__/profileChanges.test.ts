import { describe, expect, it } from 'vitest'
import { profileChanges } from 'src/pages/Profile/profileChanges'
import { roleLabels } from 'src/store/profile/selector'

describe('profileChanges', () => {
  const profile = { fullName: 'Alex Morgan' }

  it('is nothing when the name is unchanged, or differs only by spaces', () => {
    expect(profileChanges(profile, { fullName: 'Alex Morgan' })).toEqual({})
    expect(profileChanges(profile, { fullName: '  Alex Morgan ' })).toEqual({})
  })

  it('sends the new name, trimmed', () => {
    expect(profileChanges(profile, { fullName: '  Alex J Morgan ' })).toEqual({ fullName: 'Alex J Morgan' })
  })
})

describe('roleLabels', () => {
  it('names the admin role, and every role when there is more than one', () => {
    expect(roleLabels(['admin'])).toBe('Administrator')
    expect(roleLabels(['buyer', 'admin'])).toBe('Buyer, Administrator')
  })
})
