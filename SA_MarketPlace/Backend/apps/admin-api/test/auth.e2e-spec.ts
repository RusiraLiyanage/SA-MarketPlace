// This suite hits register/login many times; the rate limit has its own spec.
process.env.AUTH_THROTTLE_LIMIT = '1000'

import { createHmac } from 'crypto'
import { INestApplication, VersioningType } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
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

// Requires the local database: pnpm db:up, pnpm db:seed. Admins are created per run and removed
// in afterAll; the seeded admin is only read. Emails use the default allowed domain, so the
// default configuration is what is tested.
describe('Admin auth (e2e)', () => {
  let app: INestApplication
  let dataSource: DataSource
  let jwtSecret: string

  const base = '/api/admin/v1/auth'
  const password = 'Sup3rSecret!'
  const domainRefused =
    'Admin accounts are only available to Sample Assist staff email addresses'

  // Unique per run, so repeated runs never collide.
  const run = Date.now()
  const createdEmails: string[] = []
  let counter = 0

  const post = (path: string, body: object) =>
    request(app.getHttpServer()).post(`${base}/${path}`).send(body)

  const login = (email: string, secret = password) =>
    post('login', { email, password: secret })

  const logoutWith = (token?: string) => {
    const call = request(app.getHttpServer()).post(`${base}/logout`)
    return token ? call.set('Authorization', `Bearer ${token}`) : call
  }

  const claims = (token: string) =>
    JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())

  // A fresh address at the allowed domain, removed in afterAll.
  const newEmail = (label: string): string => {
    counter += 1
    const email = `e2e.admin.${label}.${counter}.${run}@sampleassist.com.au`
    createdEmails.push(email)
    return email
  }

  const registerBody = (
    email: string,
    overrides: Record<string, unknown> = {},
  ) => ({
    fullName: 'Jamie van der Lee',
    email,
    password,
    acceptTerms: true,
    ...overrides,
  })

  const register = (email: string, overrides: Record<string, unknown> = {}) =>
    post('register', registerBody(email, overrides))

  // A registered admin, ready to sign in.
  const signUp = async (label: string) => {
    const email = newEmail(label)
    const response = await register(email)
    expect(response.status).toBe(201)
    return { email, token: response.body.access_token as string }
  }

  const accountCount = async (email: string): Promise<number> => {
    const [{ count }] = await dataSource.query(
      `SELECT count(*)::int AS count FROM "user" WHERE email = $1`,
      [email.toLowerCase()],
    )
    return count
  }

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
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
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
    jwtSecret = app.get(ConfigService).getOrThrow<string>('JWT_SECRET')
  })

  afterAll(async () => {
    const ids = `SELECT id FROM "user" WHERE email = ANY($1)`
    await dataSource.query(
      `DELETE FROM password_reset_token WHERE user_id IN (${ids})`,
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
    it('creates an admin and returns a token for this app only', async () => {
      const email = newEmail('create')

      const response = await register(email)

      expect(response.status).toBe(201)
      expect(claims(response.body.access_token)).toMatchObject({
        email,
        roles: ['admin'],
        aud: 'admin',
      })
    })

    it('stores an active admin with the name split, the terms accepted and the real password length', async () => {
      const email = newEmail('stored')
      await register(email, { fullName: '  Mary   Jane van der Berg ' })

      const [row] = await dataSource.query(
        `SELECT u.first_name, u.last_name, u.status, u.phone, u.organisation_id,
                u.password_hash, u.password_length, u.terms_accepted_at,
                (SELECT array_agg(role::text) FROM user_role WHERE user_id = u.id) AS roles
         FROM "user" u WHERE u.email = $1`,
        [email],
      )
      expect(row).toMatchObject({
        first_name: 'Mary Jane van der',
        last_name: 'Berg',
        status: 'active',
        phone: null,
        organisation_id: null,
        password_length: password.length,
        roles: ['admin'],
      })
      expect(row.terms_accepted_at).toBeInstanceOf(Date)
      expect(row.password_hash).not.toBe(password)
      expect(row.password_hash).toMatch(/^\$2[aby]\$/)
    })

    it('stores the email lowercased, however it was typed', async () => {
      const email = newEmail('mixed-case')

      const response = await register(email, {
        email: ` ${email.toUpperCase()} `,
      })

      expect(response.status).toBe(201)
      expect(claims(response.body.access_token).email).toBe(email)
      expect(await accountCount(email)).toBe(1)
    })

    it('accepts names right at the 100-character limit', async () => {
      const response = await register(newEmail('maxname'), {
        fullName: `${'a'.repeat(100)} ${'b'.repeat(100)}`,
      })

      expect(response.status).toBe(201)
    })

    describe('who may register (ADR 0038)', () => {
      it.each([
        ['another domain', (id: string) => `e2e.${id}@gmail.com`],
        [
          'a look-alike prefix',
          (id: string) => `e2e.${id}@evil-sampleassist.com.au`,
        ],
        [
          'a look-alike suffix',
          (id: string) => `e2e.${id}@sampleassist.com.au.evil.test`,
        ],
        ['a subdomain', (id: string) => `e2e.${id}@mail.sampleassist.com.au`],
        [
          'the domain in the local part',
          (id: string) => `sampleassist.com.au.${id}@gmail.com`,
        ],
      ])('refuses %s, and creates nothing', async (_label, makeEmail) => {
        const email = makeEmail(`${run}.${counter++}`)

        const response = await register(email)

        expect(response.status).toBe(400)
        expect(response.body.error).toBe('ECB001')
        expect(response.body.message).toBe(domainRefused)
        expect(await accountCount(email)).toBe(0)
      })

      it('takes the domain case-insensitively', async () => {
        const email = newEmail('upper-domain')

        const response = await register(email, {
          email: email.replace('@sampleassist.com.au', '@SampleAssist.COM.AU'),
        })

        expect(response.status).toBe(201)
      })

      it('does not reveal whether an address outside the domain already has an account', async () => {
        // A seller who really exists, and a stranger: the same answer.
        const known = await register('priya@bindimedsupply.com.au')
        const unknown = await register(`nobody.${run}@bindimedsupply.com.au`)

        expect(known.status).toBe(400)
        expect(known.body).toEqual(unknown.body)
      })

      it('follows ADMIN_EMAIL_DOMAINS, read each time, and allows nobody when it is empty', async () => {
        const original = process.env.ADMIN_EMAIL_DOMAINS
        counter += 1
        const partner = `e2e.admin.partner.${counter}.${run}@partner.example`
        const staff = newEmail('configured-staff')
        createdEmails.push(partner)
        try {
          process.env.ADMIN_EMAIL_DOMAINS = ' Partner.Example , other.test '
          const allowed = await register(partner)
          const noLongerStaff = await register(staff)

          process.env.ADMIN_EMAIL_DOMAINS = ''
          const nobody = await register(newEmail('configured-empty'))

          expect(allowed.status).toBe(201)
          expect(noLongerStaff.status).toBe(400)
          expect(nobody.status).toBe(400)
        } finally {
          if (original === undefined) delete process.env.ADMIN_EMAIL_DOMAINS
          else process.env.ADMIN_EMAIL_DOMAINS = original
        }
        expect(await accountCount(staff)).toBe(0)
      })
    })

    describe('an address that already has an account', () => {
      it('is a 409, whatever the case it is typed in', async () => {
        const admin = await signUp('duplicate')

        const same = await register(admin.email)
        const upper = await register(admin.email, {
          email: admin.email.toUpperCase(),
        })
        const seeded = await register('a.morgan@sampleassist.com.au')

        for (const response of [same, upper, seeded]) {
          expect(response.status).toBe(409)
          expect(response.body.message).toBe(
            'An account with this email already exists',
          )
        }
        expect(await accountCount(admin.email)).toBe(1)
      })

      it('lets only one of several simultaneous registrations for one email win, the rest getting 409', async () => {
        const email = newEmail('race')

        const results = await Promise.all(
          [1, 2, 3, 4, 5, 6].map(() => register(email)),
        )

        const statuses = results.map((r) => r.status).sort()
        expect(statuses).toEqual([201, 409, 409, 409, 409, 409])
        expect(await accountCount(email)).toBe(1)
      })
    })

    describe('validation', () => {
      it.each([
        [
          'a one-word name',
          { fullName: 'Madonna' },
          'fullName must be a full name',
        ],
        [
          'a first name over 100 characters',
          { fullName: `${'a'.repeat(101)} Lee` },
          'fullName must be a full name',
        ],
        [
          'a last name over 100 characters',
          { fullName: `Jamie ${'b'.repeat(101)}` },
          'fullName must be a full name',
        ],
        [
          'a weak password',
          { password: 'weak' },
          'password must be at least 8 characters',
        ],
        [
          'no symbol in the password',
          { password: 'NoSymbol123' },
          'password must be',
        ],
        [
          'no tick to accept the terms',
          { acceptTerms: undefined },
          'you must accept the terms',
        ],
        [
          'the tick left unticked',
          { acceptTerms: false },
          'you must accept the terms',
        ],
        [
          'the tick as a string',
          { acceptTerms: 'false' },
          'you must accept the terms',
        ],
        [
          'a confirmPassword',
          { confirmPassword: password },
          'property confirmPassword should not exist',
        ],
        [
          'a role of its own choosing',
          { role: 'admin' },
          'property role should not exist',
        ],
        [
          'an invitation code, which no longer exists',
          { inviteCode: 'ANYTHING' },
          'property inviteCode should not exist',
        ],
        [
          'an email that is not one',
          { email: 'not-an-email' },
          'email must be an email',
        ],
      ])(
        'refuses %s, and creates nothing',
        async (_label, overrides, message) => {
          const email = newEmail('validation')

          const response = await register(email, overrides)

          expect(response.status).toBe(400)
          expect(response.body.message).toContain(message)
          expect(await accountCount(email)).toBe(0)
        },
      )

      it('names every missing field when the body is empty', async () => {
        const response = await post('register', {})

        expect(response.status).toBe(400)
        for (const expected of [
          'fullName',
          'email',
          'password',
          'you must accept the terms',
        ]) {
          expect(response.body.message).toContain(expected)
        }
      })
    })
  })

  describe('login', () => {
    it('signs in a registered admin, with a token for this app', async () => {
      const admin = await signUp('login')

      const response = await login(admin.email)

      expect(response.status).toBe(200)
      expect(claims(response.body.access_token)).toMatchObject({
        roles: ['admin'],
        aud: 'admin',
      })
    })

    it('signs in the seeded admin', async () => {
      const response = await login(
        'a.morgan@sampleassist.com.au',
        'Password123!',
      )

      expect(response.status).toBe(200)
    })

    it('refuses a wrong password and an unknown email with the same message', async () => {
      const admin = await signUp('wrong-password')

      const wrong = await login(admin.email, 'WrongPassw0rd!')
      const unknown = await login(`nobody.${run}@example.com`)

      expect(wrong.status).toBe(401)
      expect(unknown.status).toBe(401)
      expect(wrong.body).toEqual(unknown.body)
    })

    it.each([
      ['a seller', 'priya@bindimedsupply.com.au'],
      ['a buyer', 'j.shaw@saclinics.com.au'],
    ])(
      'refuses %s on the admin portal, even with the right password',
      async (_label, email) => {
        const response = await login(email, 'Password123!')

        expect(response.status).toBe(403)
        expect(response.body.message).toBe('This account cannot sign in here')
      },
    )
  })

  describe('logout', () => {
    it('refuses a request with no token', async () => {
      expect((await logoutWith()).status).toBe(401)
    })

    it('kills the token it was called with, but a new login works', async () => {
      const admin = await signUp('logout')
      const token = (await login(admin.email)).body.access_token as string

      expect((await logoutWith(token)).status).toBe(204)
      expect((await logoutWith(token)).status).toBe(401)

      const fresh = (await login(admin.email)).body.access_token as string
      expect((await logoutWith(fresh)).status).toBe(204)
    })

    it('ends every session for the admin, including the one from registering', async () => {
      const admin = await signUp('logout-all')
      const deviceA = (await login(admin.email)).body.access_token as string
      const deviceB = (await login(admin.email)).body.access_token as string

      await logoutWith(deviceA)

      expect((await logoutWith(deviceB)).status).toBe(401)
      expect((await logoutWith(admin.token)).status).toBe(401)
    })

    it('leaves other admins signed in', async () => {
      const first = await signUp('logout-first')
      const second = await signUp('logout-second')

      await logoutWith(first.token)

      expect((await logoutWith(second.token)).status).toBe(204)
    })
  })

  describe('tokens from other apps', () => {
    // A token signed with this app's own secret and a real admin's details, differing in one claim.
    const forge = (
      claimsToSign: Record<string, unknown>,
      options: { secret?: string } = {},
    ): string => {
      const encode = (value: object) =>
        Buffer.from(JSON.stringify(value)).toString('base64url')
      const header = encode({ alg: 'HS256', typ: 'JWT' })
      const now = Math.floor(Date.now() / 1000)
      const payload = encode({ iat: now, exp: now + 600, ...claimsToSign })
      const signature = createHmac('sha256', options.secret ?? jwtSecret)
        .update(`${header}.${payload}`)
        .digest('base64url')
      return `${header}.${payload}.${signature}`
    }

    it('refuses a token for another audience, while the same token for this app is accepted', async () => {
      const admin = await signUp('audience')
      const [{ id, token_version: tokenVersion }] = await dataSource.query(
        `SELECT id, token_version FROM "user" WHERE email = $1`,
        [admin.email],
      )
      const identity = {
        sub: id,
        email: admin.email,
        roles: ['admin'],
        tokenVersion,
      }

      const customer = await logoutWith(forge({ ...identity, aud: 'customer' }))
      const supplier = await logoutWith(forge({ ...identity, aud: 'supplier' }))
      const noAudience = await logoutWith(forge(identity))
      const expired = await logoutWith(
        forge({
          ...identity,
          aud: 'admin',
          exp: Math.floor(Date.now() / 1000) - 60,
        }),
      )
      const wrongSecret = await logoutWith(
        forge({ ...identity, aud: 'admin' }, { secret: 'not-the-secret' }),
      )
      // Last, and only because it signs the user out: it proves the forgery itself is sound,
      // so the 401s above come from the one claim that was changed.
      const control = await logoutWith(forge({ ...identity, aud: 'admin' }))

      expect([customer.status, supplier.status, noAudience.status]).toEqual([
        401, 401, 401,
      ])
      expect(expired.status).toBe(401)
      expect(wrongSecret.status).toBe(401)
      expect(control.status).toBe(204)
    })
  })

  describe('forgot/reset password', () => {
    const forgot = (email: string) => post('forgot-password', { email })

    it('responds identically whether or not the email exists, no enumeration (ADR 0029)', async () => {
      const admin = await signUp('forgot-same')

      const known = await forgot(admin.email)
      const unknown = await forgot(`nobody.${run}@example.com`)

      expect(known.status).toBe(unknown.status)
      expect(known.body).toEqual(unknown.body)
    })

    it("links to the admin app's own reset page, whatever the other apps are set to", async () => {
      const admin = await signUp('reset-link')
      const settings: Record<string, string> = {
        ADMIN_RESET_URL: 'https://admin.example.com/reset-password',
        CUSTOMER_RESET_URL: 'https://decoy-1.example.com/reset',
        SUPPLIER_RESET_URL: 'https://decoy-2.example.com/reset',
      }
      const saved = Object.fromEntries(
        Object.keys(settings).map((key) => [key, process.env[key]]),
      )
      Object.assign(process.env, settings)
      try {
        sendMail.mockClear()
        await forgot(admin.email)

        const text = (sendMail.mock.calls[0][0] as MailMessage).text
        const link = new URL(
          text.match(/Choose a new password: (\S+)/)?.[1] ?? '',
        )
        expect(`${link.origin}${link.pathname}`).toBe(
          'https://admin.example.com/reset-password',
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

    it('emails a reset link, and resetting works for an admin', async () => {
      const admin = await signUp('reset')
      sendMail.mockClear()
      await forgot(admin.email)
      expect(sendMail).toHaveBeenCalledTimes(1)

      const newPassword = 'BrandNewAdm1n!'
      const reset = await post('reset-password', {
        token: lastResetToken(),
        password: newPassword,
      })

      expect(reset.status).toBe(200)
      expect((await login(admin.email, password)).status).toBe(401)
      expect((await login(admin.email, newPassword)).status).toBe(200)
      const [row] = await dataSource.query(
        `SELECT password_length FROM "user" WHERE email = $1`,
        [admin.email],
      )
      expect(row.password_length).toBe(newPassword.length)
    })

    it('signs out every session once the password is reset', async () => {
      const admin = await signUp('reset-sessions')
      sendMail.mockClear()
      await forgot(admin.email)

      await post('reset-password', {
        token: lastResetToken(),
        password: 'BrandNewAdm1n!',
      })

      expect((await logoutWith(admin.token)).status).toBe(401)
    })

    it('accepts a reset link once only', async () => {
      const admin = await signUp('reset-once')
      sendMail.mockClear()
      await forgot(admin.email)
      const token = lastResetToken()

      const first = await post('reset-password', {
        token,
        password: 'BrandNewAdm1n!',
      })
      const second = await post('reset-password', {
        token,
        password: 'Another1Passw0rd!',
      })

      expect(first.status).toBe(200)
      expect(second.status).toBe(400)
      expect((await login(admin.email, 'BrandNewAdm1n!')).status).toBe(200)
    })

    it('refuses a made-up token and a weak new password', async () => {
      const admin = await signUp('reset-bad')
      sendMail.mockClear()
      await forgot(admin.email)

      const madeUp = await post('reset-password', {
        token: 'f'.repeat(64),
        password: 'BrandNewAdm1n!',
      })
      const weak = await post('reset-password', {
        token: lastResetToken(),
        password: 'weak',
      })

      expect(madeUp.status).toBe(400)
      expect(weak.status).toBe(400)
      expect((await login(admin.email)).status).toBe(200)
    })
  })
})
