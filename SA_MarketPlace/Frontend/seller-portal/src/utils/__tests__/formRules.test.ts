import type { FormInstance } from 'antd'
import { describe, expect, it } from 'vitest'
import { abnRules, acceptTermsRules, confirmPasswordRules, contactNameRules } from 'src/utils/formRules'

const run = async (rule: unknown, value: unknown, form: Partial<FormInstance> = {}) => {
  const resolved = typeof rule === 'function' ? rule(form as FormInstance) : rule
  return (resolved as { validator: (r: unknown, v: unknown) => Promise<void> }).validator({}, value)
}

describe('confirmPasswordRules', () => {
  const [, matches] = confirmPasswordRules('password')
  const form = { getFieldValue: () => 'Passw0rd!2026' } as unknown as Partial<FormInstance>

  it('accepts the same password', async () => {
    await expect(run(matches, 'Passw0rd!2026', form)).resolves.toBeUndefined()
  })

  it('rejects a different password', async () => {
    await expect(run(matches, 'Other1!pass', form)).rejects.toThrow('Passwords do not match')
  })
})

describe('acceptTermsRules', () => {
  const [rule] = acceptTermsRules('You must accept the terms')

  it('accepts a ticked box', async () => {
    await expect(run(rule, true)).resolves.toBeUndefined()
  })

  it('rejects an empty or unticked box', async () => {
    await expect(run(rule, undefined)).rejects.toThrow('You must accept the terms')
    await expect(run(rule, false)).rejects.toThrow('You must accept the terms')
  })
})

describe('abnRules', () => {
  const rule = abnRules[1]

  it('accepts a valid ABN, spaced as the form shows it', async () => {
    await expect(run(rule, '51 824 753 556')).resolves.toBeUndefined()
  })

  it('rejects a number with a wrong checksum or length', async () => {
    await expect(run(rule, '51 824 753 557')).rejects.toThrow('Enter a valid 11-digit ABN')
    await expect(run(rule, '51 824')).rejects.toThrow('Enter a valid 11-digit ABN')
  })

  it('leaves an empty box to the required rule', async () => {
    await expect(run(rule, '')).resolves.toBeUndefined()
  })
})

describe('contactNameRules', () => {
  const rule = contactNameRules[1]

  it('accepts a first and a last name, however many words come before the last', async () => {
    await expect(run(rule, 'Priya Nair')).resolves.toBeUndefined()
    await expect(run(rule, 'Jamie van der Lee')).resolves.toBeUndefined()
  })

  it('asks for both names when there is only one word', async () => {
    await expect(run(rule, 'Priya')).rejects.toThrow('Enter your first and last name')
  })

  it('rejects a part longer than 100 characters, which the backend would answer with a 400', async () => {
    await expect(run(rule, `${'a'.repeat(101)} Nair`)).rejects.toThrow('Name is too long')
    await expect(run(rule, `Priya ${'n'.repeat(101)}`)).rejects.toThrow('Name is too long')
  })
})
