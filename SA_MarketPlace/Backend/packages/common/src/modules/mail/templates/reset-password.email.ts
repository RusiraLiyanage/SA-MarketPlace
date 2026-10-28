import { renderEmail, type RenderedEmail } from './layout'

export interface ResetPasswordEmailData {
  firstName: string
  resetLink: string
  /** How long the link works, in minutes. */
  ttlMinutes: number
  supportEmail?: string
}

export const RESET_PASSWORD_SUBJECT =
  'Reset your Sample Assist Marketplace password'

/** The email for "Forgot password?". The link works once (backend ADR 0029). */
export const resetPasswordEmail = ({
  firstName,
  resetLink,
  ttlMinutes,
  supportEmail,
}: ResetPasswordEmailData): RenderedEmail =>
  renderEmail({
    preheader: `Choose a new password. The link works for ${ttlMinutes} minutes.`,
    heading: 'Reset your password',
    greeting: `Hi ${firstName},`,
    paragraphs: [
      'We received a request to reset the password for your Sample Assist Marketplace account. Select the button below to choose a new one.',
      `For your security the link works once and expires in ${ttlMinutes} minutes.`,
    ],
    button: { label: 'Choose a new password', url: resetLink },
    note: "Didn't ask for this? You can ignore this email. Your password stays the same and nobody can change it without this link.",
    supportEmail,
  })
