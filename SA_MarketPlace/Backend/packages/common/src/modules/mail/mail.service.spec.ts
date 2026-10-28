import { Logger } from '@nestjs/common'
import type { Transporter } from 'nodemailer'
import { MailService } from './mail.service'

const CONFIGURED = {
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  GOOGLE_REFRESH_TOKEN: 'refresh-token',
  MAIL_FROM_ADDRESS: 'sender@example.com',
}

const message = {
  to: 'buyer@example.com',
  subject: 'Reset your password',
  text: 'Link: https://x/reset?token=abc',
  html: '<p>Link</p>',
}

// The real service with its two outside seams replaced: the settings, and the Gmail transport.
class TestMailService extends MailService {
  readonly sendMail = jest.fn().mockResolvedValue({})
  readonly transportsCreated: Record<string, string | undefined>[] = []

  constructor(private readonly settings: Record<string, string | undefined>) {
    super()
  }

  protected override env() {
    return this.settings
  }

  protected override createTransport(env: Record<string, string | undefined>) {
    this.transportsCreated.push(env)
    return { sendMail: this.sendMail } as unknown as Transporter
  }
}

// `send` does not wait for the delivery, so a test waits for the work that follows it.
const settle = () => new Promise((resolve) => setImmediate(resolve))

describe('MailService', () => {
  let log: jest.SpyInstance
  let warn: jest.SpyInstance
  let error: jest.SpyInstance

  beforeEach(() => {
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation()
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation()
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation()
  })
  afterEach(() => jest.restoreAllMocks())

  it('only logs the message when no mail settings are set', async () => {
    const mail = new TestMailService({})

    mail.send(message)
    await settle()

    expect(mail.transportsCreated).toHaveLength(0)
    expect(mail.sendMail).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('[mock email] to=buyer@example.com'),
    )
    expect(warn).not.toHaveBeenCalled()
  })

  it('warns, naming what is missing, and logs the message when only some are set', async () => {
    const mail = new TestMailService({
      GOOGLE_CLIENT_ID: 'client-id',
      GOOGLE_CLIENT_SECRET: 'secret',
    })

    mail.send(message)
    await settle()

    expect(mail.sendMail).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('GOOGLE_REFRESH_TOKEN, MAIL_FROM_ADDRESS'),
    )
    expect(log).toHaveBeenCalledWith(expect.stringContaining('[mock email]'))
  })

  it('sends through Gmail when every setting is set, with the display name', async () => {
    const mail = new TestMailService({
      ...CONFIGURED,
      MAIL_FROM_NAME: 'Sample Assist',
    })

    mail.send(message)
    await settle()

    expect(mail.sendMail).toHaveBeenCalledWith({
      from: { name: 'Sample Assist', address: 'sender@example.com' },
      to: 'buyer@example.com',
      subject: 'Reset your password',
      text: message.text,
      html: message.html,
    })
  })

  it('names the sender "Sample Assist Marketplace" unless told otherwise', async () => {
    const mail = new TestMailService(CONFIGURED)

    mail.send(message)
    await settle()

    expect(mail.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: {
          name: 'Sample Assist Marketplace',
          address: 'sender@example.com',
        },
      }),
    )
  })

  it('does not log the message body, which holds a one-time link, when it really sends', async () => {
    const mail = new TestMailService(CONFIGURED)

    mail.send(message)
    await settle()

    const logged = log.mock.calls.map(([line]) => String(line)).join('\n')
    expect(logged).toContain('Email sent to buyer@example.com')
    expect(logged).not.toContain('token=abc')
  })

  it('reuses one connection for every message', async () => {
    const mail = new TestMailService(CONFIGURED)

    mail.send(message)
    mail.send({ ...message, to: 'other@example.com' })
    await settle()

    expect(mail.transportsCreated).toHaveLength(1)
    expect(mail.sendMail).toHaveBeenCalledTimes(2)
  })

  it('never throws or waits, and logs the failure without the link, when Gmail refuses', async () => {
    const mail = new TestMailService(CONFIGURED)
    mail.sendMail.mockRejectedValue(new Error('invalid_grant'))

    expect(() => mail.send(message)).not.toThrow()
    await settle()

    expect(error).toHaveBeenCalledWith(
      expect.stringContaining(
        'Could not send email to buyer@example.com: invalid_grant',
      ),
    )
    expect(String(error.mock.calls[0]?.[0])).not.toContain('token=abc')
  })
})
