import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import {
  AllExceptionsFilter,
  MailMessage,
  MailService,
} from '@sa-marketplace/common'
import * as request from 'supertest'
import { DataSource } from 'typeorm'
import { API_PREFIX } from '../src/app.constant'
import { AppModule } from '../src/app.module'
import { AppValidationPipe } from '../src/app.pipe'

// This suite hits register/login many times; the rate limit is tuned elsewhere.
process.env.AUTH_THROTTLE_LIMIT = '1000'

// Requires the local database: pnpm db:up, pnpm db:seed.
// Tests run in order sharing one seller registered first, so run the whole file.
describe('Supplier auth (e2e)', () => {
  let app: INestApplication
  let dataSource: DataSource

  const base = '/api/supplier/v1/auth'
  const password = 'Sup3rSecret!'

  // Unique per run, so repeated runs never collide.
  const run = Date.now()
  const email = `e2e.seller.${run}@example.com`
  const createdEmails = [email]

  const registerBody = (overrides: Record<string, unknown> = {}) => ({
    businessName: `E2E Supplies ${run}`,
    abn: '51824753556', // Bindi MedSupply's checksum-valid ABN (seed.sql)
    businessType: 'Wholesaler',
    contactName: 'Jamie van der Lee',
    email,
    password,
    phone: '0400 111 222',
    confirmAuthorised: true,
    ...overrides,
  })

  const post = (path: string, body: object) =>
    request(app.getHttpServer()).post(`${base}/${path}`).send(body)

  const register = (overrides: Record<string, unknown> = {}) =>
    post('register', registerBody(overrides))

  const login = (as = email, secret = password) =>
    post('login', { email: as, password: secret })

  const claims = (token: string) =>
    JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())

  // The reset token only ever reaches the caller via the "emailed" link
  // (ADR 0029); MailService is overridden with a spy to read it.
  const sendMail = jest.fn()
  const lastResetToken = (): string => {
    const message = sendMail.mock.calls.at(-1)[0] as MailMessage
    const match = message.text.match(/token=([a-f0-9]+)/)
    if (!match) {
      throw new Error(`No reset token found in mailed text: ${message.text}`)
    }
    return match[1]
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue({ send: sendMail })
      .compile()

    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI, prefix: API_PREFIX })
    app.useGlobalPipes(new AppValidationPipe())
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()
    // Bound to loopback, not supertest's wildcard: a random wildcard port can collide with
    // a server another program holds on 127.0.0.1, which then answers with an empty 404.
    await app.listen(0, '127.0.0.1')

    dataSource = app.get(DataSource)
  })

  afterAll(async () => {
    const ids = `SELECT id FROM "user" WHERE email = ANY($1)`
    await dataSource.query(
      `DELETE FROM password_reset_token WHERE user_id IN (${ids})`,
      [createdEmails],
    )
    await dataSource.query(
      `DELETE FROM supplier_profile WHERE user_id IN (${ids})`,
      [createdEmails],
    )
    await dataSource.query(`DELETE FROM user_role WHERE user_id IN (${ids})`, [
      createdEmails,
    ])
    await dataSource.query(`DELETE FROM "user" WHERE email = ANY($1)`, [
      createdEmails,
    ])
    await app.close()
  })

  describe('register', () => {
    it('creates a seller and returns a token for this app', async () => {
      const response = await register()

      expect(response.status).toBe(201)
      expect(claims(response.body.access_token)).toMatchObject({
        email,
        roles: ['seller'],
        aud: 'supplier',
      })
    })

    it('stores the user, the seller role and a pending supplier profile (ADR 0031)', async () => {
      const [row] = await dataSource.query(
        `SELECT u.first_name, u.last_name, u.phone, u.password_hash, u.password_length,
                u.organisation_id, u.terms_accepted_at, r.role,
                sp.business_name, sp.abn, sp.business_type, sp.status
         FROM "user" u
         JOIN user_role r ON r.user_id = u.id
         JOIN supplier_profile sp ON sp.user_id = u.id
         WHERE u.email = $1`,
        [email],
      )

      expect(row).toMatchObject({
        // Split on the last space.
        first_name: 'Jamie van der',
        last_name: 'Lee',
        phone: '0400 111 222',
        password_length: password.length,
        organisation_id: null,
        terms_accepted_at: null,
        role: 'seller',
        business_name: `E2E Supplies ${run}`,
        abn: '51824753556',
        business_type: 'Wholesaler',
        // Approval is an admin action, never something registering sets.
        status: 'pending_review',
      })
      // Hashed, never the plain password.
      expect(row.password_hash).not.toBe(password)
      expect(row.password_hash.startsWith('$2')).toBe(true)
    })

    it('accepts a sign-up without the optional business type', async () => {
      const optionalEmail = `e2e.seller.optional.${run}@example.com`
      createdEmails.push(optionalEmail)

      const response = await register({
        email: optionalEmail,
        businessType: undefined,
      })

      expect(response.status).toBe(201)
      const [row] = await dataSource.query(
        `SELECT sp.business_type FROM supplier_profile sp
         JOIN "user" u ON u.id = sp.user_id WHERE u.email = $1`,
        [optionalEmail],
      )
      expect(row.business_type).toBeNull()
    })

    it('rejects an email that already has an account', async () => {
      const response = await register()

      expect(response.status).toBe(409)
      expect(response.body.error).toBe('ECB409')
    })

    it('rejects an email already used by a buyer', async () => {
      const response = await register({ email: 'j.shaw@saclinics.com.au' })

      expect(response.status).toBe(409)
    })

    it('rejects an ABN that fails the checksum', async () => {
      const response = await register({
        email: `e2e.badabn.${run}@example.com`,
        abn: '51824753557',
      })

      expect(response.status).toBe(400)
      expect(response.body.message).toContain(
        'abn must be a valid 11-digit Australian Business Number',
      )
    })

    it('rejects a one-word contact name', async () => {
      const response = await register({
        email: `e2e.oneword.${run}@example.com`,
        contactName: 'Madonna',
      })

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('contactName must be a full name')
    })

    it.each([
      [
        'a first name over 100 characters',
        `${'a'.repeat(101)} Lee`,
        'toolongfirst',
      ],
      [
        'a last name over 100 characters',
        `Jamie ${'b'.repeat(101)}`,
        'toolonglast',
      ],
    ])(
      'rejects %s with 400, not a server error',
      async (_label, contactName, key) => {
        const response = await register({
          email: `e2e.${key}.${run}@example.com`,
          contactName,
        })

        expect(response.status).toBe(400)
        expect(response.body.message).toContain(
          'contactName must be a full name',
        )
        const [{ count }] = await dataSource.query(
          `SELECT count(*)::int AS count FROM "user" WHERE email = $1`,
          [`e2e.${key}.${run}@example.com`],
        )
        expect(count).toBe(0)
      },
    )

    it('accepts names right at the 100-character limit', async () => {
      const email = `e2e.maxname.${run}@example.com`
      createdEmails.push(email)

      const response = await register({
        email,
        contactName: `${'a'.repeat(100)} ${'b'.repeat(100)}`,
      })

      expect(response.status).toBe(201)
    })

    it('rejects a password that does not meet the backend rule', async () => {
      const response = await register({
        email: `e2e.weakpw.${run}@example.com`,
        password: 'password1',
      })

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('password must be at least 8')
    })

    it.each([[false], ['true'], [undefined]])(
      'rejects confirmAuthorised = %p',
      async (value) => {
        const response = await register({
          email: `e2e.noauth.${run}@example.com`,
          confirmAuthorised: value,
        })

        expect(response.status).toBe(400)
        expect(response.body.message).toContain('you must confirm you are')
      },
    )

    it('rejects confirmPassword — matching the two fields is a frontend check', async () => {
      const response = await register({
        email: `e2e.extra.${run}@example.com`,
        confirmPassword: password,
      })

      expect(response.status).toBe(400)
      expect(response.body.message).toContain(
        'property confirmPassword should not exist',
      )
    })

    it('leaves nothing behind when a request is rejected', async () => {
      // Exact emails the rejected requests above used — not a LIKE pattern,
      // which could match users another spec creates in parallel.
      const rejectedEmails = [
        'badabn',
        'oneword',
        'weakpw',
        'noauth',
        'extra',
      ].map((label) => `e2e.${label}.${run}@example.com`)

      const [{ count }] = await dataSource.query(
        `SELECT count(*)::int AS count FROM "user" WHERE email = ANY($1)`,
        [rejectedEmails],
      )

      expect(count).toBe(0)
    })
  })

  describe('login', () => {
    it('lets a seller whose application is still pending sign in', async () => {
      const response = await login()

      expect(response.status).toBe(200)
      expect(claims(response.body.access_token).aud).toBe('supplier')
    })

    it('refuses the wrong password', async () => {
      const response = await login(email, 'WrongPassw0rd!')

      expect(response.status).toBe(401)
    })

    it('signs in a seeded approved seller', async () => {
      const response = await login(
        'priya@bindimedsupply.com.au',
        'Password123!',
      )

      expect(response.status).toBe(200)
    })

    it('refuses a buyer on the seller portal', async () => {
      const response = await login('j.shaw@saclinics.com.au', 'Password123!')

      expect(response.status).toBe(403)
      expect(response.body.message).toBe('This account cannot sign in here')
    })
  })

  describe('logout', () => {
    const logoutWith = (token?: string) => {
      const call = request(app.getHttpServer()).post(`${base}/logout`)
      return token ? call.set('Authorization', `Bearer ${token}`) : call
    }

    it('refuses a request with no token', async () => {
      expect((await logoutWith()).status).toBe(401)
    })

    it('kills the token it was called with, but a new login works', async () => {
      const token = (await login()).body.access_token as string

      expect((await logoutWith(token)).status).toBe(204)
      // The same token is now dead.
      expect((await logoutWith(token)).status).toBe(401)

      const fresh = (await login()).body.access_token as string
      expect((await logoutWith(fresh)).status).toBe(204)
    })

    it('ends every session for the seller, not just the calling device', async () => {
      const deviceA = (await login()).body.access_token as string
      const deviceB = (await login()).body.access_token as string

      await logoutWith(deviceA)

      expect((await logoutWith(deviceB)).status).toBe(401)
    })
  })

  describe('forgot/reset password', () => {
    const forgot = (emailToUse: string) =>
      post('forgot-password', { email: emailToUse })

    it('responds identically whether or not the email exists — no enumeration (ADR 0029)', async () => {
      const known = await forgot(email)
      const unknown = await forgot(`nobody.${run}@example.com`)

      expect(known.status).toBe(unknown.status)
      expect(known.body).toEqual(unknown.body)
    })

    it("links to the seller portal's own reset page, whatever the other apps are set to", async () => {
      const settings: Record<string, string> = {
        SUPPLIER_RESET_URL: 'https://sell.example.com/reset-password',
        CUSTOMER_RESET_URL: 'https://decoy-1.example.com/reset',
        ADMIN_RESET_URL: 'https://decoy-2.example.com/reset',
      }
      const saved = Object.fromEntries(
        Object.keys(settings).map((key) => [key, process.env[key]]),
      )
      Object.assign(process.env, settings)
      try {
        sendMail.mockClear()
        await forgot(email)

        const text = (sendMail.mock.calls[0][0] as MailMessage).text
        const link = new URL(
          text.match(/Choose a new password: (\S+)/)?.[1] ?? '',
        )
        expect(`${link.origin}${link.pathname}`).toBe(
          'https://sell.example.com/reset-password',
        )
        expect(link.searchParams.get('token')).toBe(lastResetToken())
        expect(text).not.toContain('decoy')
      } finally {
        for (const [key, value] of Object.entries(saved)) {
          if (value === undefined) {
            delete process.env[key]
          } else {
            process.env[key] = value
          }
        }
      }
    })

    it('emails a reset link, and resetting works for a seller', async () => {
      sendMail.mockClear()
      await forgot(email)
      expect(sendMail).toHaveBeenCalledTimes(1)

      const newPassword = 'BrandNewSell3r!'
      const reset = await post('reset-password', {
        token: lastResetToken(),
        password: newPassword,
      })
      expect(reset.status).toBe(200)

      expect((await login(email, password)).status).toBe(401)
      expect((await login(email, newPassword)).status).toBe(200)

      const [row] = await dataSource.query(
        `SELECT password_length FROM "user" WHERE email = $1`,
        [email],
      )
      expect(row.password_length).toBe(newPassword.length)
    })
  })
})
