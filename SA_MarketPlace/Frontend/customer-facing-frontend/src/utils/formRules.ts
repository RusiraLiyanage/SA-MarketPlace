import type { Rule } from 'antd/es/form'
import { PASSWORD_HINT, PASSWORD_PATTERN } from 'src/patterns/patterns'

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
