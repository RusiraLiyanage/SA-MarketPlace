// This suite hits register/login many times; the rate limit has its own spec.
process.env.AUTH_THROTTLE_LIMIT = '1000'

import { createHmac } from 'crypto'
import { INestApplication, VersioningType } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { AllExceptionsFilter } from '@sa-marketplace/common'
import * as request from 'supertest'
import { DataSource } from 'typeorm'
import { API_PREFIX } from '../src/app.constant'
import { AppModule } from '../src/app.module'
import { AppValidationPipe } from '../src/app.pipe'

// Requires the local database: pnpm db:up, pnpm db:seed. Admins are created per run and removed in
// afterAll; the seeded admin is only read (and signed in as, which stamps its last sign-in).
describe('Admin profile (e2e)', () => {
  let app: INestApplication
  let dataSource: DataSource
  let jwtSecret: string

  const base = '/api/admin/v1/auth'
  const password = 'Sup3rSecret!'

  const run = Date.now()
  const createdEmails: string[] = []
  let counter = 0

  const post = (path: string, body: object) =>
    request(app.getHttpServer()).post(`${base}/${path}`).send(body)
  const login = (email: string, secret = password) =>
    post('login', { email, password: secret })
  const getProfile = (token: string) =>
    request(app.getHttpServer())
      .get(`${base}/profile`)
      .set('Authorization', `Bearer ${token}`)
  const patchProfile = (token: string, body: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .patch(`${base}/profile`)
      .set('Authorization', `Bearer ${token}`)
      .send(body)
  const changePassword = (token: string, body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post(`${base}/change-password`)
      .set('Authorization', `Bearer ${token}`)
      .send(body)

  // A registered admin, ready to use.
  const signUp = async (label: string, fullName = 'Jamie van der Lee') => {
    counter += 1
    // Lower-cased as the API stores it, or afterAll would not find the row to delete.
    const email =
      `e2e.prof.${label}.${counter}.${run}@sampleassist.com.au`.toLowerCase()
    createdEmails.push(email)
    const response = await post('register', {
      fullName,
      email,
      password,
      acceptTerms: true,
    })
    expect(response.status).toBe(201)
    return { email, token: response.body.access_token as string }
  }

  const row = async (email: string) => {
    const [found] = await dataSource.query(
      `SELECT first_name AS "firstName", last_name AS "lastName", password_hash AS "passwordHash",
              password_length AS "passwordLength", created_at AS "createdAt",
              updated_at AS "updatedAt", last_sign_in_at AS "lastSignInAt"
       FROM "user" WHERE email = $1`,
      [email],
    )
    return found as {
      firstName: string
      lastName: string
      passwordHash: string
      passwordLength: number
      createdAt: Date
      updatedAt: Date
      lastSignInAt: Date | null
    }
  }

  const pause = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms))

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

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

  describe('access', () => {
    const routes: [string, string][] = [
      ['get', '/profile'],
      ['patch', '/profile'],
      ['post', '/change-password'],
    ]

    it.each(routes)('refuses %s %s with no token', async (method, path) => {
      const response = await request(app.getHttpServer())[method as 'get'](
        `${base}${path}`,
      )

      expect(response.status).toBe(401)
    })

    it("refuses a token that is for this app but not an admin's, so the role is checked, not just the audience", async () => {
      const admin = await signUp('role-guard')
      const [{ id, token_version: tokenVersion }] = await dataSource.query(
        `SELECT id, token_version FROM "user" WHERE email = $1`,
        [admin.email],
      )
      const encode = (value: object) =>
        Buffer.from(JSON.stringify(value)).toString('base64url')
      const forge = (roles: string[]) => {
        const header = encode({ alg: 'HS256', typ: 'JWT' })
        const now = Math.floor(Date.now() / 1000)
        const payload = encode({
          sub: id,
          email: admin.email,
          roles,
          tokenVersion,
          aud: 'admin',
          iat: now,
          exp: now + 600,
        })
        const signature = createHmac('sha256', jwtSecret)
          .update(`${header}.${payload}`)
          .digest('base64url')
        return `${header}.${payload}.${signature}`
      }

      const buyer = await getProfile(forge(['buyer']))
      const control = await getProfile(forge(['admin']))

      expect(buyer.status).toBe(403)
      expect(control.status).toBe(200)
    })
  })

  describe('GET /auth/profile', () => {
    it('returns the name, email, role, password length and dates the screen shows', async () => {
      const admin = await signUp('get', 'Alex Morgan')

      const response = await getProfile(admin.token)

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        fullName: 'Alex Morgan',
        email: admin.email,
        roles: ['admin'],
        passwordLength: password.length,
        memberSince: expect.any(String),
        lastSignInAt: expect.any(String),
      })
    })

    it('never includes a password or its hash', async () => {
      const admin = await signUp('get-secrets')

      const response = await getProfile(admin.token)

      const text = JSON.stringify(response.body)
      expect(text).not.toContain('$2')
      expect(text).not.toContain(password)
      expect(Object.keys(response.body).sort()).toEqual([
        'email',
        'fullName',
        'lastSignInAt',
        'memberSince',
        'passwordLength',
        'roles',
      ])
    })

    it('shows each admin only their own profile', async () => {
      const first = await signUp('get-first', 'First Person')
      const second = await signUp('get-second', 'Second Person')

      const one = await getProfile(first.token)
      const two = await getProfile(second.token)

      expect(one.body.fullName).toBe('First Person')
      expect(two.body.fullName).toBe('Second Person')
      expect(one.body.email).not.toBe(two.body.email)
    })

    it('takes "Admin since" from when the account was created', async () => {
      const admin = await signUp('get-since')

      const response = await getProfile(admin.token)

      const { createdAt } = await row(admin.email)
      expect(new Date(response.body.memberSince).getTime()).toBe(
        createdAt.getTime(),
      )
    })

    it("reports the seeded admin's real password length, so the dots are the right number", async () => {
      const seeded = await login('a.morgan@sampleassist.com.au', 'Password123!')

      const response = await getProfile(seeded.body.access_token)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        fullName: 'Alex Morgan',
        roles: ['admin'],
        passwordLength: 'Password123!'.length,
      })
    })

    describe('last sign-in', () => {
      it('is stamped when the admin registers, since they are signed in at once', async () => {
        const before = Date.now()
        const admin = await signUp('signin-register')

        const response = await getProfile(admin.token)

        const stamped = new Date(response.body.lastSignInAt).getTime()
        expect(stamped).toBeGreaterThanOrEqual(before - 1000)
        expect(stamped).toBeLessThanOrEqual(Date.now() + 1000)
      })

      it('moves forward with each sign-in', async () => {
        const admin = await signUp('signin-login')
        const first = (await getProfile(admin.token)).body.lastSignInAt
        await pause(20)

        const again = await login(admin.email)
        const second = (await getProfile(again.body.access_token)).body
          .lastSignInAt

        expect(new Date(second).getTime()).toBeGreaterThan(
          new Date(first).getTime(),
        )
      })

      it('is not changed by a wrong password, or by someone else signing in', async () => {
        const admin = await signUp('signin-untouched')
        const other = await signUp('signin-other')
        const before = (await row(admin.email)).lastSignInAt
        await pause(20)

        await login(admin.email, 'WrongPassw0rd!')
        await login(other.email)

        expect((await row(admin.email)).lastSignInAt).toEqual(before)
      })

      it('is not changed by changing the password: a fresh token is not a sign-in', async () => {
        const admin = await signUp('signin-password')
        const before = (await row(admin.email)).lastSignInAt
        await pause(20)

        await changePassword(admin.token, { newPassword: 'BrandNewAdm1n!' })

        expect((await row(admin.email)).lastSignInAt).toEqual(before)
      })

      it('is null for an account with no sign-in on record', async () => {
        const admin = await signUp('signin-null')
        await dataSource.query(
          `UPDATE "user" SET last_sign_in_at = NULL WHERE email = $1`,
          [admin.email],
        )

        const response = await getProfile(admin.token)

        expect(response.body.lastSignInAt).toBeNull()
      })
    })
  })

  describe('PATCH /auth/profile', () => {
    it('saves the full name, split on the last word and trimmed, and returns the refreshed profile', async () => {
      const admin = await signUp('patch-name')

      const response = await patchProfile(admin.token, {
        fullName: '  Mary   Jane van der Berg ',
      })

      expect(response.status).toBe(200)
      expect(response.body.fullName).toBe('Mary Jane van der Berg')
      expect(await row(admin.email)).toMatchObject({
        firstName: 'Mary Jane van der',
        lastName: 'Berg',
      })
    })

    it('treats an empty body as a no-op that writes nothing', async () => {
      const admin = await signUp('patch-empty')
      const before = await row(admin.email)
      const profileBefore = (await getProfile(admin.token)).body
      await pause(20)

      const response = await patchProfile(admin.token, {})

      expect(response.status).toBe(200)
      expect(response.body).toEqual(profileBefore)
      expect((await row(admin.email)).updatedAt).toEqual(before.updatedAt)
    })

    it('accepts names right at the 100-character limit', async () => {
      const admin = await signUp('patch-max')

      const response = await patchProfile(admin.token, {
        fullName: `${'a'.repeat(100)} ${'b'.repeat(100)}`,
      })

      expect(response.status).toBe(200)
    })

    it.each([
      ['email', { email: 'someone.else@sampleassist.com.au' }],
      ['role', { role: 'admin' }],
      ['roles', { roles: ['admin', 'buyer'] }],
      ['password', { password: 'Sneaky1Pass!' }],
      ['passwordHash', { passwordHash: 'x' }],
      ['passwordLength', { passwordLength: 99 }],
      ['status', { status: 'suspended' }],
      ['lastSignInAt', { lastSignInAt: '2020-01-01T00:00:00Z' }],
      ['memberSince', { memberSince: '2020-01-01T00:00:00Z' }],
    ])(
      'refuses to change %s: not part of what Save changes may send',
      async (field, body) => {
        const admin = await signUp(`patch-${field}`)
        const before = await row(admin.email)

        const response = await patchProfile(admin.token, body)

        expect(response.status).toBe(400)
        expect(response.body.message).toContain(
          `property ${field} should not exist`,
        )
        expect(await row(admin.email)).toEqual(before)
      },
    )

    it.each([
      ['a one-word name', { fullName: 'Madonna' }],
      ['a blank name', { fullName: '   ' }],
      [
        'a first name over 100 characters',
        { fullName: `${'a'.repeat(101)} Lee` },
      ],
      [
        'a last name over 100 characters',
        { fullName: `Jamie ${'b'.repeat(101)}` },
      ],
      ['a name that is not text', { fullName: 42 }],
    ])('refuses %s, and writes nothing', async (_label, body) => {
      const admin = await signUp('patch-invalid')
      const before = await row(admin.email)

      const response = await patchProfile(admin.token, body)

      expect(response.status).toBe(400)
      expect(await row(admin.email)).toEqual(before)
    })

    it('does not touch another admin', async () => {
      const mine = await signUp('patch-isolated')
      const theirs = await signUp('patch-isolated-other')
      const before = await row(theirs.email)

      await patchProfile(mine.token, { fullName: 'Changed Name' })

      expect(await row(theirs.email)).toEqual(before)
    })
  })

  describe('POST /auth/change-password', () => {
    it('changes the password: the old one stops working and the new one signs in', async () => {
      const admin = await signUp('pw-change')
      const before = await row(admin.email)

      const response = await changePassword(admin.token, {
        newPassword: 'NewPassw0rd!',
      })

      expect(response.status).toBe(200)
      expect(response.body.access_token).toEqual(expect.any(String))
      expect((await login(admin.email, password)).status).toBe(401)
      expect((await login(admin.email, 'NewPassw0rd!')).status).toBe(200)
      const after = await row(admin.email)
      expect(after.passwordHash).not.toBe(before.passwordHash)
      expect(after.passwordHash).not.toBe('NewPassw0rd!')
    })

    it('keeps the session that changed it, and signs out every other one', async () => {
      const admin = await signUp('pw-sessions')
      const device = (await login(admin.email)).body.access_token as string

      const response = await changePassword(admin.token, {
        newPassword: 'NewPassw0rd!',
      })
      const fresh = response.body.access_token as string

      expect((await getProfile(admin.token)).status).toBe(401)
      expect((await getProfile(device)).status).toBe(401)
      expect((await getProfile(fresh)).status).toBe(200)
    })

    it('does not sign anyone else out', async () => {
      const admin = await signUp('pw-isolated')
      const bystander = await signUp('pw-bystander')

      await changePassword(admin.token, { newPassword: 'NewPassw0rd!' })

      expect((await getProfile(bystander.token)).status).toBe(200)
    })

    it('keeps the stored length in step, so the dots follow the real password', async () => {
      const admin = await signUp('pw-length')

      const response = await changePassword(admin.token, {
        newPassword: 'AMuchLongerPassw0rd!',
      })
      const profile = await getProfile(response.body.access_token)

      expect(profile.body.passwordLength).toBe('AMuchLongerPassw0rd!'.length)
      expect((await row(admin.email)).passwordLength).toBe(
        'AMuchLongerPassw0rd!'.length,
      )
    })

    it('refuses the same password, and leaves the session alone', async () => {
      const admin = await signUp('pw-same')

      const response = await changePassword(admin.token, {
        newPassword: password,
      })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe(
        'New password must be different from the current password',
      )
      expect((await getProfile(admin.token)).status).toBe(200)
    })

    it.each([
      ['no new password', {}],
      ['a weak one', { newPassword: 'weak' }],
      ['one with no symbol', { newPassword: 'NoSymbol123' }],
      ['one with no number', { newPassword: 'NoNumber!!!' }],
    ])('refuses %s', async (_label, body) => {
      const admin = await signUp('pw-weak')

      const response = await changePassword(admin.token, body)

      expect(response.status).toBe(400)
      expect((await login(admin.email)).status).toBe(200)
    })

    it.each([
      [
        'currentPassword',
        { currentPassword: password, newPassword: 'NewPassw0rd!' },
      ],
      [
        'confirmPassword',
        { newPassword: 'NewPassw0rd!', confirmPassword: 'NewPassw0rd!' },
      ],
    ])(
      'does not take %s: the token is the proof (ADR 0030)',
      async (field, body) => {
        const admin = await signUp('pw-fields')

        const response = await changePassword(admin.token, body)

        expect(response.status).toBe(400)
        expect(response.body.message).toContain(
          `property ${field} should not exist`,
        )
        expect((await login(admin.email)).status).toBe(200)
      },
    )
  })
})
