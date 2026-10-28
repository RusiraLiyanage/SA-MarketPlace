import type { Rule } from 'antd/es/form'
import { PASSWORD_HINT, PASSWORD_PATTERN } from 'src/patterns/patterns'
import { isValidAbn } from 'src/utils/abn'

// Ant Design form rules shared by the auth and profile forms. Limits match the backend's.
export const requiredText = (label: string, max = 100): Rule[] => [
  { required: true, whitespace: true, message: `Enter your ${label}` },
  { max, message: `${label[0].toUpperCase()}${label.slice(1)} is too long` },
]

export const emailRules: Rule[] = [
  { required: true, message: 'Enter your email address' },
  { type: 'email', message: 'Enter a valid email address' },
  { max: 255, message: 'Email address is too long' },
]

export const newPasswordRules: Rule[] = [
  { required: true, message: 'Enter a password' },
  { pattern: PASSWORD_PATTERN, message: PASSWORD_HINT },
]

// The confirm field is checked in the browser only; the backend never receives it.
export const confirmPasswordRules = (passwordField: string): Rule[] => [
  { required: true, message: 'Re-enter your password' },
  ({ getFieldValue }) => ({
    validator: (_rule, value) =>
      !value || getFieldValue(passwordField) === value
        ? Promise.resolve()
        : Promise.reject(new Error('Passwords do not match')),
  }),
]

export const acceptTermsRules = (message: string): Rule[] => [
  {
    validator: (_rule, value) => (value ? Promise.resolve() : Promise.reject(new Error(message))),
  },
]

// Seller registration and business profile. Limits match the backend's.
export const abnRules: Rule[] = [
  { required: true, message: 'Enter your ABN' },
  { validator: (_rule, value: string | undefined) => (!value || isValidAbn(value) ? Promise.resolve() : Promise.reject(new Error('Enter a valid 11-digit ABN'))) },
]

// The backend splits the name on its last space, so there must be a first part and a last part, each up to 100 characters.
export const contactNameRules: Rule[] = [
  { required: true, whitespace: true, message: 'Enter your full name' },
  {
    validator: (_rule, value: string | undefined) => {
      const words = (value ?? '').trim().split(/\s+/).filter(Boolean)
      if (words.length === 0) return Promise.resolve()
      if (words.length < 2) return Promise.reject(new Error('Enter your first and last name'))
      const last = words[words.length - 1]!
      const first = words.slice(0, -1).join(' ')
      return first.length > 100 || last.length > 100 ? Promise.reject(new Error('Name is too long')) : Promise.resolve()
    },
  },
]

export const phoneRules: Rule[] = [
  { required: true, whitespace: true, message: 'Enter a phone number' },
  { max: 32, message: 'Phone number is too long' },
]
