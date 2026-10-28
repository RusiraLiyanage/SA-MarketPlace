import { Injectable, Logger } from '@nestjs/common'
import { createTransport, type Transporter } from 'nodemailer'

export interface MailMessage {
  to: string
  subject: string
  text: string
  /** The same message with formatting; clients that cannot show it use `text`. */
  html?: string
}

type Env = Record<string, string | undefined>

/** All five settings must be present to send; with any missing the service only logs (ADR 0046). */
const REQUIRED_SETTINGS = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REFRESH_TOKEN',
  'MAIL_FROM_ADDRESS',
] as const

const DEFAULT_FROM_NAME = 'Sample Assist Marketplace'

/**
 * Sends through the Gmail account the settings name, or logs the message when they are not all set (a clean checkout and
 * the tests need no credentials). Sending never throws and is not waited for: `forgot-password` must answer the same, and
 * as quickly, for an address with no account (backend ADR 0029), and a mail outage must not break the request.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private transport: Transporter | undefined

  send(message: MailMessage): void {
    void this.deliver(message)
  }

  /** Where settings come from; `process.env`, which main.ts fills from .env before the app starts. */
  protected env(): Env {
    return process.env
  }

  protected createTransport(env: Env): Transporter {
    return createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: env.MAIL_FROM_ADDRESS,
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        refreshToken: env.GOOGLE_REFRESH_TOKEN,
      },
    })
  }

  private async deliver(message: MailMessage): Promise<void> {
    const env = this.env()
    const missing = REQUIRED_SETTINGS.filter((key) => !env[key]?.trim())

    if (missing.length === REQUIRED_SETTINGS.length) {
      this.logger.log(
        `[mock email] to=${message.to} subject="${message.subject}"\n${message.text}`,
      )
      return
    }
    if (missing.length > 0) {
      this.logger.warn(
        `Email is not sent: ${missing.join(
          ', ',
        )} not set. Logging the message instead.`,
      )
      this.logger.log(
        `[mock email] to=${message.to} subject="${message.subject}"\n${message.text}`,
      )
      return
    }

    try {
      this.transport ??= this.createTransport(env)
      await this.transport.sendMail({
        from: {
          name: env.MAIL_FROM_NAME?.trim() || DEFAULT_FROM_NAME,
          address: (env.MAIL_FROM_ADDRESS ?? '').trim(),
        },
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      })
      // The message body holds a one-time link, so only the fact of sending is logged.
      this.logger.log(`Email sent to ${message.to}: "${message.subject}"`)
    } catch (error) {
      this.logger.error(
        `Could not send email to ${message.to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  }
}
