// Set before the app is built so the support contact is deterministic, whatever
// is in the developer's own .env. The suite also logs in a lot.
process.env.SUPPORT_EMAIL = 'support@example.com'
process.env.SUPPORT_PHONE = '1800 000 000'
process.env.AUTH_THROTTLE_LIMIT = '1000'

import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AllExceptionsFilter } from '@sa-marketplace/common'
import { User } from '@sa-marketplace/entities'
import * as request from 'supertest'
import { DataSource, EntityManager } from 'typeorm'
import { API_PREFIX } from '../src/app.constant'
import { AppModule } from '../src/app.module'
import { AppValidationPipe } from '../src/app.pipe'

// Requires the local database: pnpm db:up, pnpm db:seed. Each state-changing test registers its own
// seller, forced into the state under test with SQL; seeded sellers are only read. Cleaned in afterAll.
describe('Supplier application status (e2e)', () => {
  let app: INestApplication
  let dataSource: DataSource

  const base = '/api/supplier/v1'
  const run = Date.now()
  const createdEmails: string[] = []
  // Keeps emails unique when one test table reuses a label.
  let sellerCount = 0

  const resubmitBody = (overrides: Record<string, unknown> = {}) => ({
    businessName: '  Fresh Start Supplies ',
    abn: '51824753556',
    businessType: 'Distributor',
    contactName: 'Dana Q Liu',
    phone: '0400 000 000',
    confirmAuthorised: true,
    ...overrides,
  })

  // Registers a real seller (so there is a User, role and pending profile).
  const makeSeller = async (label: string) => {
    sellerCount += 1
    const email = `e2e.app.${label}.${sellerCount}.${run}@example.com`
    createdEmails.push(email)
    const response = await request(app.getHttpServer())
      .post(`${base}/auth/register`)
      .send({
        businessName: `E2E ${label} ${run}`,
        abn: '51824753556',
        businessType: 'Wholesaler',
        contactName: 'Jamie Lee',
        email,
        password: 'Sup3rSecret!',
        phone: '0400 111 222',
        confirmAuthorised: true,
      })
    return { email, token: response.body.access_token as string }
  }

  const forceRejected = (email: string) =>
    dataSource.query(
      `UPDATE supplier_profile SET status = 'rejected',
         rejection_reason = 'ABN could not be verified',
         reviewed_at = '2026-07-24T05:00:00Z'
       WHERE user_id = (SELECT id FROM "user" WHERE email = $1)`,
      [email],
    )

  const forceApproved = (email: string) =>
    dataSource.query(
      `UPDATE supplier_profile SET status = 'approved',
         approved_at = '2026-07-27T03:00:00Z', reviewed_at = '2026-07-27T03:00:00Z'
       WHERE user_id = (SELECT id FROM "user" WHERE email = $1)`,
      [email],
    )

  const profileRow = async (email: string) =>
    (
      await dataSource.query(
        `SELECT sp.*, u.first_name, u.last_name, u.phone
         FROM supplier_profile sp JOIN "user" u ON u.id = sp.user_id
         WHERE u.email = $1`,
        [email],
      )
    )[0]

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` })
  const getApplication = (token: string, path = '') =>
    request(app.getHttpServer())
      .get(`${base}/application${path}`)
      .set(auth(token))
  const acknowledge = (token: string) =>
    request(app.getHttpServer())
      .post(`${base}/application/acknowledge`)
      .set(auth(token))
  const resubmit = (token: string, body: object) =>
    request(app.getHttpServer())
      .put(`${base}/application`)
      .set(auth(token))
      .send(body)

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
  })

  afterAll(async () => {
    const ids = `SELECT id FROM "user" WHERE email = ANY($1)`
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

  describe('GET /application', () => {
    it('refuses a request with no token', async () => {
      const response = await request(app.getHttpServer()).get(
        `${base}/application`,
      )

      expect(response.status).toBe(401)
    })

    it('shows the under-review view to a seller who just registered', async () => {
      const { token } = await makeSeller('pending')

      const response = await getApplication(token)

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        status: 'pending_review',
        businessName: `E2E pending ${run}`,
        abn: '51824753556',
        submittedAt: expect.any(String),
      })
      expect(
        Date.now() - new Date(response.body.submittedAt).getTime(),
      ).toBeLessThan(60_000)
    })

    it('shows the reason, review date and support contact once rejected', async () => {
      const { email, token } = await makeSeller('rejected-view')
      await forceRejected(email)

      const response = await getApplication(token)

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        status: 'rejected',
        businessName: `E2E rejected-view ${run}`,
        rejectionReason: 'ABN could not be verified',
        reviewedAt: '2026-07-24T05:00:00.000Z',
        supportContact: { email: 'support@example.com', phone: '1800 000 000' },
      })
    })

    it('shows the approved view, not yet acknowledged, for a new approval', async () => {
      const { email, token } = await makeSeller('approved-view')
      await forceApproved(email)

      const response = await getApplication(token)

      expect(response.body).toEqual({
        status: 'approved',
        businessName: `E2E approved-view ${run}`,
        approvedAt: '2026-07-27T03:00:00.000Z',
        acknowledged: false,
      })
    })

    it('shows a seeded, already-acknowledged seller as acknowledged', async () => {
      const login = await request(app.getHttpServer())
        .post(`${base}/auth/login`)
        .send({
          email: 'priya@bindimedsupply.com.au',
          password: 'Password123!',
        })

      const response = await getApplication(login.body.access_token)

      expect(response.body).toMatchObject({
        status: 'approved',
        businessName: 'Bindi MedSupply Pty Ltd',
        acknowledged: true,
      })
    })

    it('returns 404 for a seller account that has no supplier profile', async () => {
      const { email, token } = await makeSeller('orphan')
      await dataSource.query(
        `DELETE FROM supplier_profile WHERE user_id = (SELECT id FROM "user" WHERE email = $1)`,
        [email],
      )

      const response = await getApplication(token)

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('ECB404')
    })
  })

  describe('POST /application/acknowledge', () => {
    it('refuses a request with no token', async () => {
      const response = await request(app.getHttpServer()).post(
        `${base}/application/acknowledge`,
      )

      expect(response.status).toBe(401)
    })

    it.each([['pending'], ['rejected']])(
      'is a 409 for a %s application',
      async (state) => {
        const { email, token } = await makeSeller(`ack-${state}`)
        if (state === 'rejected') {
          await forceRejected(email)
        }

        const response = await acknowledge(token)

        expect(response.status).toBe(409)
        expect(response.body.message).toBe(
          'Only an approved application can be acknowledged',
        )
      },
    )

    it('records the acknowledgement once, and keeps the original time on repeat calls', async () => {
      const { email, token } = await makeSeller('ack-approved')
      await forceApproved(email)

      expect((await acknowledge(token)).status).toBe(204)
      const first = (await profileRow(email)).approval_acknowledged_at
      expect(first).not.toBeNull()
      expect((await getApplication(token)).body.acknowledged).toBe(true)

      expect((await acknowledge(token)).status).toBe(204)
      const second = (await profileRow(email)).approval_acknowledged_at
      expect(second).toEqual(first)
    })

    it("only ever affects the signed-in seller's own application", async () => {
      const a = await makeSeller('ack-a')
      const b = await makeSeller('ack-b')
      await forceApproved(a.email)
      await forceApproved(b.email)

      await acknowledge(a.token)

      expect((await getApplication(a.token)).body.acknowledged).toBe(true)
      expect((await getApplication(b.token)).body.acknowledged).toBe(false)
    })
  })

  describe('GET /application/details', () => {
    it('pre-fills the form for a rejected seller', async () => {
      const { email, token } = await makeSeller('details')
      await forceRejected(email)

      const response = await getApplication(token, '/details')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        businessName: `E2E details ${run}`,
        abn: '51824753556',
        businessType: 'Wholesaler',
        contactName: 'Jamie Lee',
        phone: '0400 111 222',
        email,
      })
    })

    it.each([['pending'], ['approved']])(
      'is a 409 for a %s application',
      async (state) => {
        const { email, token } = await makeSeller(`details-${state}`)
        if (state === 'approved') {
          await forceApproved(email)
        }

        const response = await getApplication(token, '/details')

        expect(response.status).toBe(409)
        expect(response.body.message).toBe(
          'Only a rejected application can be updated and resubmitted',
        )
      },
    )
  })

  describe('PUT /application (update and resubmit)', () => {
    it('refuses a request with no token', async () => {
      const response = await request(app.getHttpServer())
        .put(`${base}/application`)
        .send(resubmitBody())

      expect(response.status).toBe(401)
    })

    it.each([
      ['an ABN that fails the checksum', { abn: '51824753557' }, 'abn must be'],
      ['a one-word contact name', { contactName: 'Madonna' }, 'full name'],
      [
        'a first name over 100 characters',
        { contactName: `${'a'.repeat(101)} Lee` },
        'full name',
      ],
      [
        'confirmAuthorised false',
        { confirmAuthorised: false },
        'you must confirm',
      ],
      [
        'an email',
        { email: 'x@example.com' },
        'property email should not exist',
      ],
      [
        'a password',
        { password: 'Sup3rSecret!' },
        'property password should not exist',
      ],
    ])('rejects %s', async (_label, overrides, message) => {
      const { email, token } = await makeSeller('resubmit-invalid')
      await forceRejected(email)

      const response = await resubmit(token, resubmitBody(overrides))

      expect(response.status).toBe(400)
      expect(response.body.message).toContain(message)
      // Rejected requests change nothing.
      expect((await profileRow(email)).status).toBe('rejected')
    })

    it.each([['pending'], ['approved']])(
      'is a 409 for a %s application, and changes nothing',
      async (state) => {
        const { email, token } = await makeSeller(`resubmit-${state}`)
        if (state === 'approved') {
          await forceApproved(email)
        }

        const response = await resubmit(token, resubmitBody())

        expect(response.status).toBe(409)
        expect((await profileRow(email)).business_name).toBe(
          `E2E resubmit-${state} ${run}`,
        )
      },
    )

    it('sends a rejected application back for review and clears the old decision', async () => {
      const { email, token } = await makeSeller('resubmit-ok')
      await forceRejected(email)
      await dataSource.query(
        `UPDATE supplier_profile SET submitted_at = '2026-07-20T02:00:00Z',
           approved_by_user_id = (SELECT id FROM "user" WHERE email = 'a.morgan@sampleassist.com.au')
         WHERE user_id = (SELECT id FROM "user" WHERE email = $1)`,
        [email],
      )

      const response = await resubmit(token, resubmitBody())

      // The response is the new under-review view.
      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        status: 'pending_review',
        businessName: 'Fresh Start Supplies',
        abn: '51824753556',
      })

      const row = await profileRow(email)
      expect(row).toMatchObject({
        business_name: 'Fresh Start Supplies',
        business_type: 'Distributor',
        status: 'pending_review',
        rejection_reason: null,
        reviewed_at: null,
        approved_by_user_id: null,
        first_name: 'Dana Q',
        last_name: 'Liu',
        phone: '0400 000 000',
      })
      // "Submitted" is the resubmission, not the original application.
      expect(new Date(row.submitted_at).getTime()).toBeGreaterThan(
        new Date('2026-10-01T00:00:00Z').getTime(),
      )
      // And the status endpoint now agrees.
      expect((await getApplication(token)).body.status).toBe('pending_review')
    })

    it('stores no business type when it is left blank', async () => {
      const { email, token } = await makeSeller('resubmit-blank')
      await forceRejected(email)

      await resubmit(token, resubmitBody({ businessType: '   ' }))

      expect((await profileRow(email)).business_type).toBeNull()
    })

    it('cannot be submitted twice: the second attempt is a 409', async () => {
      const { email, token } = await makeSeller('resubmit-twice')
      await forceRejected(email)

      expect((await resubmit(token, resubmitBody())).status).toBe(200)
      expect((await resubmit(token, resubmitBody())).status).toBe(409)
    })

    it('rolls the profile change back if the user update fails (one transaction)', async () => {
      const { email, token } = await makeSeller('resubmit-rollback')
      await forceRejected(email)

      // Fail only the second write, the User update, in the transaction.
      const original = EntityManager.prototype.update
      const spy = jest
        .spyOn(EntityManager.prototype, 'update')
        .mockImplementation(function (this: EntityManager, target, ...rest) {
          if (target === User) {
            throw new Error('simulated user update failure')
          }
          return original.call(this, target, ...(rest as [never, never]))
        })

      let response: request.Response
      try {
        response = await resubmit(token, resubmitBody())
      } finally {
        spy.mockRestore()
      }

      expect(response.status).toBe(500)
      const row = await profileRow(email)
      // The profile update that ran first was undone along with it.
      expect(row).toMatchObject({
        status: 'rejected',
        business_name: `E2E resubmit-rollback ${run}`,
        rejection_reason: 'ABN could not be verified',
        first_name: 'Jamie',
        last_name: 'Lee',
      })
      expect(row.reviewed_at).not.toBeNull()
    })
  })
})
