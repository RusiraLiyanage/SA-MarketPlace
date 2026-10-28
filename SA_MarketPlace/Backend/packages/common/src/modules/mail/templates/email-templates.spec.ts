import { renderEmail } from './layout'
import { resetPasswordEmail } from './reset-password.email'

const base = {
  preheader: 'Preview line',
  heading: 'A heading',
  paragraphs: ['First paragraph.', 'Second paragraph.'],
}

describe('renderEmail', () => {
  it('puts the preheader, heading and every paragraph in the html and the text', () => {
    const { html, text } = renderEmail({ ...base, greeting: 'Hi Jordan,' })

    for (const part of [
      'Preview line',
      'A heading',
      'Hi Jordan,',
      'First paragraph.',
      'Second paragraph.',
    ]) {
      expect(html).toContain(part)
    }
    expect(text).toBe(
      'A heading\n\nHi Jordan,\n\nFirst paragraph.\n\nSecond paragraph.\n\nThis is an automated message from Sample Assist Marketplace.',
    )
  })

  it('shows the button as a link, a copy-and-paste address and a plain-text line', () => {
    const url = 'https://app.test/reset?token=abc&x=1'
    const { html, text } = renderEmail({
      ...base,
      button: { label: 'Go', url },
    })

    expect(html).toContain('href="https://app.test/reset?token=abc&#38;x=1"')
    expect(html).toContain('If the button does not work')
    expect(text).toContain(`Go: ${url}`)
  })

  it('escapes anything that could break out of the html', () => {
    const { html } = renderEmail({
      ...base,
      greeting: 'Hi <script>alert(1)</script>,',
      button: { label: 'Go', url: 'https://x/"onmouseover="alert(1)' },
    })

    expect(html).not.toContain('<script>')
    expect(html).not.toContain('"onmouseover=')
  })

  it('leaves out the button, note and support line when they are not given', () => {
    const { html, text } = renderEmail(base)

    expect(html).not.toContain('If the button does not work')
    expect(html).not.toContain('mailto:')
    expect(text).not.toContain('Questions?')
  })

  it('names the support address in the footer when there is one', () => {
    const { html, text } = renderEmail({
      ...base,
      supportEmail: 'help@example.com',
    })

    expect(html).toContain('href="mailto:help@example.com"')
    expect(text).toContain('Questions? Write to help@example.com.')
  })
})

describe('resetPasswordEmail', () => {
  const email = resetPasswordEmail({
    firstName: 'Jordan <b>',
    resetLink: 'https://app.test/reset-password?token=abc',
    ttlMinutes: 30,
    supportEmail: 'help@example.com',
  })

  it('carries the link, the lifetime and the name in both versions', () => {
    expect(email.html).toContain(
      'href="https://app.test/reset-password?token=abc"',
    )
    expect(email.text).toContain('https://app.test/reset-password?token=abc')
    expect(email.html).toContain('30 minutes')
    expect(email.text).toContain('Hi Jordan <b>,')
  })

  it('escapes the name in the html only', () => {
    expect(email.html).toContain('Hi Jordan &#60;b&#62;,')
    expect(email.html).not.toContain('<b>')
  })
})
