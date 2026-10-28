import { INestApplication, VersioningType } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
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

// This suite logs in many times; the rate limit has its own spec.
process.env.AUTH_THROTTLE_LIMIT = '1000'

// Needs the local DB (pnpm db:up, db:seed). Tests share one account: run the whole file, not jest -t.
describe('Auth (e2e)', () => {
  let app: INestApplication
  let dataSource: DataSource

  const base = '/api/customer/v1/auth'
  const password = 'Password123!'

  // Unique per run, so repeated runs never collide.
  const run = Date.now()
  const email = `e2e.buyer.${run}@example.com`
  const mateEmail = `e2e.mate.${run}@example.com`
  const organisation = `E2E Test Org ${run}`

  const registerBody = (overrides: Record<string, unknown> = {}) => ({
    email,
    password,
    firstName: 'Ellie',
    lastName: 'Tester',
    organisation,
    acceptTerms: true,
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

  // The reset token is never in a response (ADR 0029); MailService is spied to read the "emailed" link.
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
    // Same global setup as main.ts.
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
    // Remove only what this run created; seed data is left alone.
    await dataSource.query(
      `DELETE FROM "user_role" WHERE user_id IN (SELECT id FROM "user" WHERE email IN ($1, $2))`,
      [email, mateEmail],
    )
    await dataSource.query(`DELETE FROM "user" WHERE email IN ($1, $2)`, [
      email,
      mateEmail,
    ])
    await dataSource.query(`DELETE FROM "organisation" WHERE name = $1`, [
      organisation,
    ])
    await app.close()
  })

  describe('register', () => {
    it('creates a buyer and returns a token for this app', async () => {
      const response = await register()

      expect(response.status).toBe(201)
      expect(claims(response.body.access_token)).toMatchObject({
        email,
        roles: ['buyer'],
        aud: 'customer',
        tokenVersion: 0,
      })
    })

    it('stores the user with the buyer role and the organisation', async () => {
      const [row] = await dataSource.query(
        `SELECT o.name AS organisation, r.role, u.password_hash, u.terms_accepted_at
           FROM "user" u
           JOIN "organisation" o ON o.id = u.organisation_id
           JOIN "user_role" r ON r.user_id = u.id
          WHERE u.email = $1`,
        [email],
      )

      expect(row.organisation).toBe(organisation)
      expect(row.role).toBe('buyer')
      // Hashed, never the plain password.
      expect(row.password_hash).not.toBe(password)
      expect(row.password_hash.startsWith('$2')).toBe(true)
      // Consent is recorded, not just checked.
      expect(row.terms_accepted_at).toBeInstanceOf(Date)
    })

    it('reuses an organisation whose name differs only by case', async () => {
      const response = await register({
        email: mateEmail,
        organisation: organisation.toUpperCase(),
      })

      expect(response.status).toBe(201)
      const [row] = await dataSource.query(
        `SELECT count(DISTINCT u.organisation_id)::int AS organisations,
                (SELECT count(*)::int FROM "organisation" WHERE lower(name) = lower($3)) AS rows
           FROM "user" u WHERE u.email IN ($1, $2)`,
        [email, mateEmail, organisation],
      )

      expect(row.organisations).toBe(1)
      expect(row.rows).toBe(1)
    })

    it('rejects an email that already has an account', async () => {
      const response = await register()

      expect(response.status).toBe(409)
      expect(response.body.error).toBe('ECB409')
    })

    it('rejects a password that does not meet the rules', async () => {
      const response = await register({
        email: `e2e.weak.${run}@example.com`,
        password: 'password1',
      })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('ECB001')
      expect(response.body.message).toContain('password must be at least 8')
    })

    it.each([
      ['missing', undefined],
      ['false', false],
      ['the string "true"', 'true'],
    ])('rejects a sign-up with acceptTerms %s', async (_label, value) => {
      const body = registerBody({ email: `e2e.terms.${run}@example.com` })
      if (value === undefined) {
        delete (body as Record<string, unknown>).acceptTerms
      } else {
        body.acceptTerms = value as never
      }

      const response = await post('register', body)

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('you must accept the terms')
    })

    it('rejects a field the DTO does not declare', async () => {
      const response = await register({
        email: `e2e.extra.${run}@example.com`,
        confirmPassword: password,
      })

      expect(response.status).toBe(400)
      expect(response.body.message).toContain(
        'property confirmPassword should not exist',
      )
    })
  })

  describe('login', () => {
    it('accepts the right password, whatever the email case', async () => {
      const response = await login(email.toUpperCase())

      expect(response.status).toBe(200)
      expect(claims(response.body.access_token).sub).toEqual(expect.any(String))
    })

    it('refuses the wrong password', async () => {
      const response = await login(email, 'WrongPassword1!')

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('EUA001')
    })

    it('refuses an unknown email with the same message', async () => {
      const response = await login(`nobody.${run}@example.com`)

      expect(response.status).toBe(401)
      expect(response.body.message).toBe('Invalid email or password')
    })

    // Seeded accounts, read-only: k.doyle is suspended, priya is a seller.
    it('refuses a suspended account', async () => {
      const response = await login('k.doyle@worksafe.com.au', password)

      expect(response.status).toBe(403)
      expect(response.body.message).toBe('This account is not active')
    })

    it('refuses a seller on the customer app', async () => {
      const response = await login('priya@bindimedsupply.com.au', password)

      expect(response.status).toBe(403)
      expect(response.body.message).toBe('This account cannot sign in here')
    })
  })

  describe('protected routes', () => {
    const profile = () => request(app.getHttpServer()).get(`${base}/profile`)

    const tokenFor = async () => (await login()).body.access_token as string

    it('refuses a request with no token', async () => {
      expect((await profile()).status).toBe(401)
    })

    it('refuses a tampered token', async () => {
      const token = await tokenFor()
      const response = await profile().set(
        'Authorization',
        `Bearer ${token.slice(0, -2)}xx`,
      )

      expect(response.status).toBe(401)
    })

    it('refuses a token issued for another app', async () => {
      const token = await tokenFor()
      // Same secret, wrong audience: JwtStrategy must still refuse it.
      const jwt = app.get(JwtService, { strict: false })
      const payload = claims(token)
      delete payload.aud
      delete payload.iat
      delete payload.exp
      const foreign = jwt.sign(payload, { audience: 'admin' })

      const response = await profile().set('Authorization', `Bearer ${foreign}`)

      expect(response.status).toBe(401)
    })

    it('returns the profile, without the password hash', async () => {
      const token = await tokenFor()
      const response = await profile().set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        email,
        roles: ['buyer'],
        organisationName: organisation,
        ordersPlaced: 0,
        // Real character count, for My Profile's dots — not the fixture's
        // coincidental length, so this stays correct if `password` changes.
        passwordLength: password.length,
      })
      expect(new Date(response.body.memberSince).getTime()).not.toBeNaN()
      // Never the password or its hash (ADR 0027) — passwordLength only.
      expect(response.body.passwordHash).toBeUndefined()
      expect(response.body.password).toBeUndefined()
    })

    it('counts every order this buyer has ever placed, cancelled ones included (ADR 0027)', async () => {
      // Seeded: o.fraser has ORD-2026-00124 (dispatched) and ORD-2026-00128
      // (cancelled) — two orders were genuinely placed, whatever happened after.
      const loginResponse = await post('login', {
        email: 'o.fraser@transportltd.com.au',
        password,
      })
      const token = loginResponse.body.access_token as string

      const response = await profile().set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(200)
      expect(response.body.ordersPlaced).toBe(2)
    })
  })

  describe('update profile', () => {
    // Its own buyer, not the shared `email` fixture other blocks read from —
    // this one gets mutated, and nothing else in this file should see that.
    const patchEmail = `e2e.patch.${run}@example.com`
    let patchToken: string

    beforeAll(async () => {
      const registered = await register({ email: patchEmail })
      patchToken = registered.body.access_token as string
    })

    afterAll(async () => {
      await dataSource.query(
        `DELETE FROM "user_role" WHERE user_id IN (SELECT id FROM "user" WHERE email = $1)`,
        [patchEmail],
      )
      await dataSource.query(`DELETE FROM "user" WHERE email = $1`, [
        patchEmail,
      ])
    })

    const patch = (body: object, token = patchToken) =>
      request(app.getHttpServer())
        .patch(`${base}/profile`)
        .set('Authorization', `Bearer ${token}`)
        .send(body)

    it('refuses a request with no token', async () => {
      const response = await request(app.getHttpServer())
        .patch(`${base}/profile`)
        .send({ firstName: 'Nope' })

      expect(response.status).toBe(401)
    })

    it('updates only the fields sent, leaving the rest unchanged', async () => {
      const response = await patch({
        firstName: 'Updated',
        phone: '0400 000 111',
      })

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        firstName: 'Updated',
        lastName: 'Tester', // set at registration, never touched by this PATCH
        phone: '0400 000 111',
      })
    })

    it('rejects email, password and organisation on the same request (ADR 0028)', async () => {
      const response = await patch({
        email: 'hacker@example.com',
        password: 'NewPassw0rd!',
        organisation: 'Evil Org',
      })

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('property email should not exist')
      expect(response.body.message).toContain(
        'property password should not exist',
      )
      expect(response.body.message).toContain(
        'property organisation should not exist',
      )
    })

    it('treats an empty body as a no-op', async () => {
      const before = await patch({}) // already updated by the earlier test
      const response = await patch({})

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        firstName: before.body.firstName,
        lastName: before.body.lastName,
        phone: before.body.phone,
      })
    })
  })

  describe('forgot/reset password', () => {
    // Its own buyer — this block genuinely changes the password and bumps
    // tokenVersion, neither of which anything else in this file should see.
    const resetEmail = `e2e.reset.${run}@example.com`
    const originalPassword = password

    beforeAll(async () => {
      await register({ email: resetEmail })
    })

    afterAll(async () => {
      await dataSource.query(
        `DELETE FROM password_reset_token WHERE user_id IN (SELECT id FROM "user" WHERE email = $1)`,
        [resetEmail],
      )
      await dataSource.query(
        `DELETE FROM "user_role" WHERE user_id IN (SELECT id FROM "user" WHERE email = $1)`,
        [resetEmail],
      )
      await dataSource.query(`DELETE FROM "user" WHERE email = $1`, [
        resetEmail,
      ])
    })

    const forgot = (emailToUse: string) =>
      post('forgot-password', { email: emailToUse })
    const reset = (token: string, newPassword: string) =>
      post('reset-password', { token, password: newPassword })

    it('responds identically whether or not the email exists — no enumeration (ADR 0029)', async () => {
      const knownEmail = await forgot(resetEmail)
      const unknownEmail = await forgot(`nobody.${run}@example.com`)

      expect(knownEmail.status).toBe(unknownEmail.status)
      expect(knownEmail.body).toEqual(unknownEmail.body)
    })

    it("links to the buyer marketplace's own reset page, whatever the other apps are set to", async () => {
      const settings: Record<string, string> = {
        CUSTOMER_RESET_URL: 'https://shop.example.com/reset-password',
        SUPPLIER_RESET_URL: 'https://decoy-1.example.com/reset',
        ADMIN_RESET_URL: 'https://decoy-2.example.com/reset',
      }
      const saved = Object.fromEntries(
        Object.keys(settings).map((key) => [key, process.env[key]]),
      )
      Object.assign(process.env, settings)
      try {
        sendMail.mockClear()
        await forgot(resetEmail)

        const text = (sendMail.mock.calls[0][0] as MailMessage).text
        const link = new URL(
          text.match(/Choose a new password: (\S+)/)?.[1] ?? '',
        )
        expect(`${link.origin}${link.pathname}`).toBe(
          'https://shop.example.com/reset-password',
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

    it('does not send mail for an email that has no account', async () => {
      sendMail.mockClear()
      await forgot(`still-nobody.${run}@example.com`)

      expect(sendMail).not.toHaveBeenCalled()
    })

    it('emails a working reset link for a real account', async () => {
      sendMail.mockClear()
      await forgot(resetEmail)

      expect(sendMail).toHaveBeenCalledTimes(1)
      const message = sendMail.mock.calls[0][0] as MailMessage
      expect(message.to).toBe(resetEmail)
      expect(lastResetToken()).toMatch(/^[a-f0-9]{64}$/)
    })

    it('requesting a new link invalidates the previous, unused one', async () => {
      sendMail.mockClear()
      await forgot(resetEmail)
      const staleToken = lastResetToken()

      sendMail.mockClear()
      await forgot(resetEmail)
      const freshToken = lastResetToken()

      expect(staleToken).not.toBe(freshToken)

      const usingStale = await reset(staleToken, 'Whatever9!')
      expect(usingStale.status).toBe(400)
      expect(usingStale.body.error).toBe('ECB001')

      // The fresh one is still good — prove it, then request yet another so
      // the next test starts from a known-unused token of its own.
      sendMail.mockClear()
      await forgot(resetEmail)
    })

    it('rejects a garbage token with the same generic message a real-but-expired one gets', async () => {
      const response = await reset('not-a-real-token', 'Whatever9!')

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('ECB001')
      expect(response.body.message).toBe(
        'This reset link is invalid or has expired',
      )
    })

    it('rejects a new password that fails the password rule', async () => {
      const token = lastResetToken()
      const response = await reset(token, 'weak')

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('password must be at least 8')
    })

    it('resets the password, ends every existing session, and the token cannot be reused', async () => {
      const oldToken = (await login(resetEmail, originalPassword)).body
        .access_token as string

      const token = lastResetToken()
      const newPassword = 'BrandNewPassw0rd!'
      const resetResponse = await reset(token, newPassword)
      expect(resetResponse.status).toBe(200)

      // Old password stops working, new one works.
      expect((await login(resetEmail, originalPassword)).status).toBe(401)
      const newLogin = await login(resetEmail, newPassword)
      expect(newLogin.status).toBe(200)

      // passwordLength is rewritten alongside the hash, not left stale.
      const profileWithNewToken = await request(app.getHttpServer())
        .get(`${base}/profile`)
        .set('Authorization', `Bearer ${newLogin.body.access_token}`)
      expect(profileWithNewToken.body.passwordLength).toBe(newPassword.length)

      // The session that existed before the reset is dead — tokenVersion
      // bumped (ADR 0018 via ADR 0029), same as logout.
      const profileWithOldToken = await request(app.getHttpServer())
        .get(`${base}/profile`)
        .set('Authorization', `Bearer ${oldToken}`)
      expect(profileWithOldToken.status).toBe(401)

      // Single use: the same token cannot reset the password again.
      const replay = await reset(token, 'AnotherOne9!')
      expect(replay.status).toBe(400)
      expect(replay.body.error).toBe('ECB001')
    })
  })

  describe('change password', () => {
    // Its own buyer — this block genuinely changes the password and bumps
    // tokenVersion, neither of which anything else in this file should see.
    const changeEmail = `e2e.changepw.${run}@example.com`
    const originalPassword = password

    beforeAll(async () => {
      await register({ email: changeEmail })
    })

    afterAll(async () => {
      await dataSource.query(
        `DELETE FROM "user_role" WHERE user_id IN (SELECT id FROM "user" WHERE email = $1)`,
        [changeEmail],
      )
      await dataSource.query(`DELETE FROM "user" WHERE email = $1`, [
        changeEmail,
      ])
    })

    const changePassword = (token: string, body: object) =>
      request(app.getHttpServer())
        .post(`${base}/change-password`)
        .set('Authorization', `Bearer ${token}`)
        .send(body)

    it('refuses a request with no token', async () => {
      const response = await request(app.getHttpServer())
        .post(`${base}/change-password`)
        .send({ newPassword: 'Whatever9!' })

      expect(response.status).toBe(401)
    })

    it('rejects a currentPassword field — there is no current-password check (ADR 0030)', async () => {
      const token = (await login(changeEmail, originalPassword)).body
        .access_token as string

      const response = await changePassword(token, {
        currentPassword: originalPassword,
        newPassword: 'Whatever9!',
      })

      expect(response.status).toBe(400)
      expect(response.body.message).toContain(
        'property currentPassword should not exist',
      )
    })

    it('rejects a new password that fails the password rule', async () => {
      const token = (await login(changeEmail, originalPassword)).body
        .access_token as string

      const response = await changePassword(token, { newPassword: 'weak' })

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('password must be at least 8')
    })

    it('rejects setting the same password again, with no proof required to detect it', async () => {
      const token = (await login(changeEmail, originalPassword)).body
        .access_token as string

      const response = await changePassword(token, {
        newPassword: originalPassword,
      })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe(
        'New password must be different from the current password',
      )
    })

    it('changes the password, re-issues a token for this session, and ends every other session', async () => {
      const oldToken = (await login(changeEmail, originalPassword)).body
        .access_token as string
      const newPassword = 'BrandNewPassw0rd!'

      const changeResponse = await changePassword(oldToken, { newPassword })
      expect(changeResponse.status).toBe(200)
      const newToken = changeResponse.body.access_token as string
      expect(newToken).toEqual(expect.any(String))
      expect(newToken).not.toBe(oldToken)

      // Old password stops working, new one works.
      expect((await login(changeEmail, originalPassword)).status).toBe(401)
      expect((await login(changeEmail, newPassword)).status).toBe(200)

      // The OLD token (the one the request itself was authorised with) is
      // dead — tokenVersion bumped, same mechanism as logout (ADR 0018).
      const profileWithOldToken = await request(app.getHttpServer())
        .get(`${base}/profile`)
        .set('Authorization', `Bearer ${oldToken}`)
      expect(profileWithOldToken.status).toBe(401)

      // ...but the NEW token this response just handed back still works —
      // the calling session survives its own tokenVersion bump (ADR 0030).
      const profileWithNewToken = await request(app.getHttpServer())
        .get(`${base}/profile`)
        .set('Authorization', `Bearer ${newToken}`)
      expect(profileWithNewToken.status).toBe(200)
      expect(profileWithNewToken.body.passwordLength).toBe(newPassword.length)
    })
  })

  describe('logout', () => {
    it('kills the token it was called with, but a new login works', async () => {
      const token = (await login()).body.access_token as string
      const authorised = (t: string) =>
        request(app.getHttpServer())
          .get(`${base}/profile`)
          .set('Authorization', `Bearer ${t}`)

      expect((await authorised(token)).status).toBe(200)

      const loggedOut = await request(app.getHttpServer())
        .post(`${base}/logout`)
        .set('Authorization', `Bearer ${token}`)
      expect(loggedOut.status).toBe(204)

      expect((await authorised(token)).status).toBe(401)

      const fresh = (await login()).body.access_token as string
      expect((await authorised(fresh)).status).toBe(200)
    })

    it('bumped the stored token version', async () => {
      const [row] = await dataSource.query(
        `SELECT token_version FROM "user" WHERE email = $1`,
        [email],
      )

      expect(row.token_version).toBeGreaterThan(0)
    })
  })
})
