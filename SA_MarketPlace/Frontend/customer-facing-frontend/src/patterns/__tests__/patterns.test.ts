import { describe, expect, it } from 'vitest'
import { PASSWORD_PATTERN } from 'src/patterns/patterns'

describe('PASSWORD_PATTERN', () => {
  it.each(['Passw0rd!2026', 'NewPassw0rd!2026', 'Abcdef1!'])('accepts %s', (password) => {
    expect(PASSWORD_PATTERN.test(password)).toBe(true)
  })

  it.each([
    ['too short', 'Ab1!'],
    ['no uppercase letter', 'passw0rd!2026'],
    ['no lowercase letter', 'PASSW0RD!2026'],
    ['no number', 'Password!!'],
    ['no symbol', 'Passw0rd2026'],
    ['contains a space', 'Passw0rd! 2026'],
  ])('rejects a password with %s', (_reason, password) => {
    expect(PASSWORD_PATTERN.test(password)).toBe(false)
  })
})
