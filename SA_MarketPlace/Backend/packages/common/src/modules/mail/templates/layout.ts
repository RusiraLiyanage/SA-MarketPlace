import { escapeHtml } from './escape'

export interface EmailLayoutOptions {
  /** The grey line shown next to the subject in an inbox list, before the email is opened. */
  preheader: string
  heading: string
  /** "Hi Jordan," */
  greeting?: string
  /** Plain text; each becomes a paragraph. */
  paragraphs: string[]
  /** The one thing the reader should do. */
  button?: { label: string; url: string }
  /** A quieter box under the button, for example why they got the email and what to do if it was not them. */
  note?: string
  /** Shown in the footer so the reader knows who to ask. */
  supportEmail?: string
}

export interface RenderedEmail {
  html: string
  text: string
}

const BRAND = '#0958d9'
const FONT = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

/**
 * The one look every email shares: a branded header, the message, one button, a note, and a footer. Built from tables and
 * inline styles because email programs ignore most modern CSS. Each email only supplies its words (backend ADR 0046);
 * the plain-text version is made from the same words, for programs that do not show HTML.
 */
export const renderEmail = (options: EmailLayoutOptions): RenderedEmail => {
  const {
    preheader,
    heading,
    greeting,
    paragraphs,
    button,
    note,
    supportEmail,
  } = options

  const paragraphHtml = paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#262626;">${escapeHtml(
          paragraph,
        )}</p>`,
    )
    .join('')

  const buttonHtml = button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
        <tr><td align="center" bgcolor="${BRAND}" style="border-radius:6px;">
          <a href="${escapeHtml(
            button.url,
          )}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:${FONT};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">${escapeHtml(
        button.label,
      )}</a>
        </td></tr>
      </table>
      <p style="margin:0 0 24px;font-size:13px;line-height:1.5;color:#666666;">If the button does not work, copy this address into your browser:<br><a href="${escapeHtml(
        button.url,
      )}" target="_blank" style="color:${BRAND};word-break:break-all;">${escapeHtml(
        button.url,
      )}</a></p>`
    : ''

  const noteHtml = note
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">
        <tr><td style="background:#f5f7fa;border-left:4px solid ${BRAND};border-radius:4px;padding:14px 16px;font-size:14px;line-height:1.55;color:#434343;">${escapeHtml(
        note,
      )}</td></tr>
      </table>`
    : ''

  const supportHtml = supportEmail
    ? `Questions? Write to <a href="mailto:${escapeHtml(
        supportEmail,
      )}" style="color:#666666;">${escapeHtml(supportEmail)}</a>.<br>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(
    preheader,
  )}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f2f5;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:10px;font-family:${FONT};">
        <tr><td style="padding:24px 32px;border-bottom:1px solid #f0f0f0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="36" height="36" align="center" valign="middle" bgcolor="${BRAND}" style="border-radius:8px;color:#ffffff;font-size:20px;font-weight:700;line-height:36px;">&#10003;</td>
            <td style="padding-left:12px;font-family:${FONT};">
              <div style="font-size:18px;font-weight:700;line-height:1.1;color:#1f1f1f;">Sample Assist</div>
              <div style="font-size:10px;letter-spacing:1.6px;color:#8c8c8c;">MARKETPLACE</div>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:32px 32px 24px;font-family:${FONT};">
          <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;color:#1f1f1f;">${escapeHtml(
            heading,
          )}</h1>
          ${
            greeting
              ? `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#262626;">${escapeHtml(
                  greeting,
                )}</p>`
              : ''
          }
          ${paragraphHtml}
          ${buttonHtml}
          ${noteHtml}
        </td></tr>
        <tr><td style="padding:20px 32px 28px;border-top:1px solid #f0f0f0;font-family:${FONT};font-size:12px;line-height:1.6;color:#8c8c8c;">
          ${supportHtml}This is an automated message from Sample Assist Marketplace. Please do not reply to it.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const text = [
    heading,
    greeting,
    ...paragraphs,
    button && `${button.label}: ${button.url}`,
    note,
    [
      supportEmail && `Questions? Write to ${supportEmail}.`,
      'This is an automated message from Sample Assist Marketplace.',
    ]
      .filter(Boolean)
      .join(' '),
  ]
    .filter((part): part is string => Boolean(part))
    .join('\n\n')

  return { html, text }
}
