import type { FormInstance } from 'antd'
import { describe, expect, it } from 'vitest'
import { acceptTermsRules, confirmPasswordRules } from 'src/utils/formRules'

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
