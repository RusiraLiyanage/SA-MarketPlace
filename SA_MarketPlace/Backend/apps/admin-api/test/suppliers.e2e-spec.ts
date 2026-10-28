// This suite signs in rarely, but registers an admin per run; the rate limit has its own spec.
process.env.AUTH_THROTTLE_LIMIT = '1000'

import { INestApplication, VersioningType } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { AllExceptionsFilter, MailService } from '@sa-marketplace/common'
import { createHmac } from 'crypto'
import * as request from 'supertest'
import { DataSource } from 'typeorm'
import { API_PREFIX } from '../src/app.constant'
import { AppModule } from '../src/app.module'
import { AppValidationPipe } from '../src/app.pipe'

type Status = 'pending_review' | 'approved' | 'rejected'

type Supplier = { id: string; userId: string; email: string; name: string }

// Requires the local database: pnpm db:up, pnpm db:seed. Admins, suppliers and products are created
// per run and removed in afterAll; the seeded suppliers are never touched (lists are scoped by the
// run's name prefix, the summary is checked as a change).
describe('Admin supplier verification (e2e)', () => {
  let app: INestApplication
  let dataSource: DataSource
  let jwtSecret: string
  let mail: jest.SpyInstance

  const base = '/api/admin/v1'
  const password = 'Sup3rSecret!'
  const run = Date.now()
  const prefix = `E2E Sup ${run}`

  const adminEmails: string[] = []
  const supplierEmails: string[] = []
  let counter = 0

  let admin: { email: string; token: string; id: string; fullName: string }

  const http = () => request(app.getHttpServer())
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` })
  const get = (path: string, token = admin.token) =>
    http().get(`${base}${path}`).set(auth(token))
  const post = (path: string, body?: object, token = admin.token) =>
    http().post(`${base}${path}`).set(auth(token)).send(body)
  const approve = (id: string, token = admin.token) =>
    post(`/suppliers/${id}/approve`, undefined, token)
  const reject = (id: string, body: object, token = admin.token) =>
    post(`/suppliers/${id}/reject`, body, token)

  // Each list test makes its own `scope`, so suppliers from other tests never show up in it.
  const list = (scope: string, query = '') =>
    get(`/suppliers?search=${encodeURIComponent(`${prefix} ${scope}`)}${query}`)

  const signUpAdmin = async (label: string) => {
    counter += 1
    const email = `e2e.sup.${label}.${counter}.${run}@sampleassist.com.au`
    adminEmails.push(email)
    const fullName = 'Casey Reviewer'
    const response = await http()
      .post(`${base}/auth/register`)
      .send({ fullName, email, password, acceptTerms: true })
    expect(response.status).toBe(201)
    const [{ id }] = await dataSource.query(
      `SELECT id FROM "user" WHERE email = $1`,
      [email],
    )
    return { email, token: response.body.access_token as string, id, fullName }
  }

  // A supplier with a user, a seller role and a profile, inserted directly (the seller app owns sign-up).
  const makeSupplier = async (
    label: string,
    options: {
      status?: Status
      submittedAt?: string
      reviewedAt?: string | null
      rejectionReason?: string | null
      firstName?: string
      lastName?: string
      abn?: string
      businessName?: string
      scope?: string
    } = {},
  ): Promise<Supplier> => {
    counter += 1
    const email = `e2e.sup.${label}.${counter}.${run}@example.com`
    supplierEmails.push(email)
    const name =
      options.businessName ??
      `${prefix}${options.scope ? ` ${options.scope}` : ''} ${label}`
    const [{ id: userId }] = await dataSource.query(
      `INSERT INTO "user" (email, password_hash, password_length, first_name, last_name, phone)
       VALUES ($1, '$2b$10$fixture.hash.not.a.secret.fixture.hash.not.a.secretxx', 12, $2, $3, '0400 000 000')
       RETURNING id`,
      [email, options.firstName ?? 'Sam', options.lastName ?? 'Supplier'],
    )
    await dataSource.query(
      `INSERT INTO user_role (user_id, role) VALUES ($1, 'seller')`,
      [userId],
    )
    const [{ id }] = await dataSource.query(
      `INSERT INTO supplier_profile (user_id, business_name, abn, business_type, status,
                                     rejection_reason, submitted_at, reviewed_at)
       VALUES ($1, $2, $3, 'Test business', $4, $5, $6, $7) RETURNING id`,
      [
        userId,
        name,
        options.abn ?? `5182${String(counter).padStart(7, '0')}`,
        options.status ?? 'pending_review',
        options.rejectionReason ?? null,
        options.submittedAt ?? '2026-08-01T00:00:00Z',
        options.reviewedAt ?? null,
      ],
    )
    return { id, userId, email, name }
  }

  const addProduct = async (
    supplier: Supplier,
    categorySlug: string,
    status: 'draft' | 'published' | 'retired' = 'published',
  ): Promise<void> => {
    counter += 1
    await dataSource.query(
      `INSERT INTO product (supplier_profile_id, category_id, name, sku, price, quantity,
                            low_stock_threshold, listing_status)
       VALUES ($1, (SELECT id FROM category WHERE slug = $2), 'E2E product', $3, 5.00, 10, 2, $4)`,
      [supplier.id, categorySlug, `E2E-SUP-${run}-${counter}`, status],
    )
  }

  const profileRow = async (id: string) => {
    const [row] = await dataSource.query(
      `SELECT status, approved_at AS "approvedAt", reviewed_at AS "reviewedAt",
              approved_by_user_id AS "approvedByUserId", rejection_reason AS "rejectionReason",
              submitted_at AS "submittedAt", updated_at AS "updatedAt"
       FROM supplier_profile WHERE id = $1`,
      [id],
    )
    return row as {
      status: Status
      approvedAt: Date | null
      reviewedAt: Date | null
      approvedByUserId: string | null
      rejectionReason: string | null
      submittedAt: Date
      updatedAt: Date
    }
  }

  const forge = (
    userId: string,
    email: string,
    roles: string[],
    aud = 'admin',
  ) => {
    const encode = (value: object) =>
      Buffer.from(JSON.stringify(value)).toString('base64url')
    const header = encode({ alg: 'HS256', typ: 'JWT' })
    const now = Math.floor(Date.now() / 1000)
    const payload = encode({
      sub: userId,
      email,
      roles,
      tokenVersion: 0,
      aud,
      iat: now,
      exp: now + 600,
    })
    const signature = createHmac('sha256', jwtSecret)
      .update(`${header}.${payload}`)
      .digest('base64url')
    return `${header}.${payload}.${signature}`
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI, prefix: API_PREFIX })
    app.useGlobalPipes(new AppValidationPipe())
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()
    // Bound to loopback, not supertest's wildcard, so a port another program holds cannot answer.
    await app.listen(0, '127.0.0.1')

    dataSource = app.get(DataSource)
    jwtSecret = app.get(ConfigService).getOrThrow<string>('JWT_SECRET')
    mail = jest.spyOn(app.get(MailService), 'send')
    admin = await signUpAdmin('main')
  })

  beforeEach(() => {
    mail.mockClear()
  })

  afterAll(async () => {
    const supplierIds = `SELECT id FROM supplier_profile WHERE user_id IN (SELECT id FROM "user" WHERE email = ANY($1))`
    await dataSource.query(
      `DELETE FROM product WHERE supplier_profile_id IN (${supplierIds})`,
      [supplierEmails],
    )
    await dataSource.query(
      `DELETE FROM supplier_profile WHERE id IN (${supplierIds})`,
      [supplierEmails],
    )
    const all = [...supplierEmails, ...adminEmails]
    const ids = `SELECT id FROM "user" WHERE email = ANY($1)`
    await dataSource.query(
      `DELETE FROM password_reset_token WHERE user_id IN (${ids})`,
      [all],
    )
    await dataSource.query(`DELETE FROM user_role WHERE user_id IN (${ids})`, [
      all,
    ])
    await dataSource.query(`DELETE FROM "user" WHERE email = ANY($1)`, [all])
    await app.close()
  })

  describe('access', () => {
    const someId = '00000000-0000-4000-8000-000000000000'
    const routes: [string, string][] = [
      ['get', '/suppliers'],
      ['get', '/suppliers/summary'],
      ['get', `/suppliers/${someId}`],
      ['post', `/suppliers/${someId}/approve`],
      ['post', `/suppliers/${someId}/reject`],
    ]

    it.each(routes)('refuses %s %s with no token', async (method, path) => {
      const response = await http()[method as 'get'](`${base}${path}`)

      expect(response.status).toBe(401)
    })

    it.each(routes)(
      "refuses %s %s for a token that is for this app but not an admin's",
      async (method, path) => {
        const token = forge(admin.id, admin.email, ['seller'])

        const response = await http()
          [method as 'get'](`${base}${path}`)
          .set(auth(token))
          .send({ reason: 'abn_not_verified' })

        expect(response.status).toBe(403)
      },
    )

    it('refuses a token for another app, even with the admin role', async () => {
      const supplier = await makeSupplier('aud')

      const response = await approve(
        supplier.id,
        forge(admin.id, admin.email, ['admin'], 'supplier'),
      )

      expect(response.status).toBe(401)
      expect((await profileRow(supplier.id)).status).toBe('pending_review')
    })

    it('answers an admin token', async () => {
      const response = await get('/suppliers/summary')

      expect(response.status).toBe(200)
    })
  })

  describe('GET /suppliers', () => {
    it('shows the table columns, with the contact name joined and the ABN unspaced', async () => {
      const supplier = await makeSupplier('shape', {
        scope: 'shape',
        firstName: 'Priya',
        lastName: 'van der Nair',
        abn: '51824753556',
      })

      const response = await list('shape')

      expect(response.status).toBe(200)
      expect(response.body.data).toEqual([
        {
          id: supplier.id,
          businessName: supplier.name,
          abn: '51824753556',
          contactName: 'Priya van der Nair',
          contactEmail: supplier.email,
          submittedAt: '2026-08-01T00:00:00.000Z',
          status: 'pending_review',
          reviewedAt: null,
          rejectionReason: null,
        },
      ])
      expect(JSON.stringify(response.body)).not.toContain('$2b$')
    })

    it('puts pending first, oldest first, then the decided ones, latest decision first', async () => {
      const pendingNewer = await makeSupplier('q-pend-new', {
        scope: 'queue',
        submittedAt: '2026-08-05T00:00:00Z',
      })
      const approvedOld = await makeSupplier('q-appr-old', {
        scope: 'queue',
        status: 'approved',
        submittedAt: '2026-06-01T00:00:00Z',
        reviewedAt: '2026-06-10T00:00:00Z',
      })
      const pendingOlder = await makeSupplier('q-pend-old', {
        scope: 'queue',
        submittedAt: '2026-08-02T00:00:00Z',
      })
      const rejectedNew = await makeSupplier('q-rej-new', {
        scope: 'queue',
        status: 'rejected',
        submittedAt: '2026-07-01T00:00:00Z',
        reviewedAt: '2026-07-20T00:00:00Z',
        rejectionReason: 'ABN could not be verified',
      })

      const response = await list('queue', '&limit=30')
      const ids = response.body.data
        .map((row: { id: string }) => row.id)
        .filter((id: string) =>
          [pendingNewer, approvedOld, pendingOlder, rejectedNew].some(
            (s) => s.id === id,
          ),
        )

      expect(ids).toEqual([
        pendingOlder.id,
        pendingNewer.id,
        rejectedNew.id,
        approvedOld.id,
      ])
    })

    it('filters by status', async () => {
      const pending = await makeSupplier('f-pend', { scope: 'filter' })
      const approved = await makeSupplier('f-appr', {
        scope: 'filter',
        status: 'approved',
        reviewedAt: '2026-08-02T00:00:00Z',
      })
      const rejected = await makeSupplier('f-rej', {
        scope: 'filter',
        status: 'rejected',
        reviewedAt: '2026-08-03T00:00:00Z',
        rejectionReason: 'x',
      })

      const only = async (status: string) =>
        (await list('filter', `&status=${status}&limit=30`)).body.data.map(
          (row: { id: string }) => row.id,
        )

      const pendingIds = await only('pending_review')
      const approvedIds = await only('approved')
      const rejectedIds = await only('rejected')

      expect(pendingIds).toContain(pending.id)
      expect(pendingIds).not.toContain(approved.id)
      expect(pendingIds).not.toContain(rejected.id)
      expect(approvedIds).toContain(approved.id)
      expect(approvedIds).not.toContain(pending.id)
      expect(rejectedIds).toContain(rejected.id)
      expect(rejectedIds).not.toContain(approved.id)
    })

    it('searches the business name without regard to case', async () => {
      const supplier = await makeSupplier('case', {
        businessName: `${prefix} zQuokka Medical`,
      })

      const response = await get(
        `/suppliers?search=${encodeURIComponent(`${prefix} ZQUOKKA`)}`,
      )

      expect(response.body.data.map((r: { id: string }) => r.id)).toEqual([
        supplier.id,
      ])
    })

    it('searches by ABN with or without spaces, only when the term is all digits', async () => {
      const supplier = await makeSupplier('abn', { abn: '99887766554' })

      const spaced = await get(
        `/suppliers?search=${encodeURIComponent('99 887 766 554')}`,
      )
      const partial = await get(`/suppliers?search=7766`)
      const mixed = await get(
        `/suppliers?search=${encodeURIComponent('abn 7766')}`,
      )

      expect(spaced.body.data.map((r: { id: string }) => r.id)).toEqual([
        supplier.id,
      ])
      expect(partial.body.data.map((r: { id: string }) => r.id)).toContain(
        supplier.id,
      )
      // "abn 7766" is a name search, so the digits must not match the ABN.
      expect(mixed.body.data.map((r: { id: string }) => r.id)).not.toContain(
        supplier.id,
      )
    })

    it.each([['%'], ['_'], ['\\']])(
      'treats %s in a search as plain text, not a wildcard',
      async (term) => {
        await makeSupplier('wild')

        const response = await get(
          `/suppliers?search=${encodeURIComponent(`${prefix} ${term}`)}`,
        )

        expect(response.status).toBe(200)
        expect(response.body.data).toEqual([])
      },
    )

    it.each([['%'], ['_'], ['%%'], ['_ _']])(
      'finds nothing for a search that is only the wildcard %s',
      async (term) => {
        await makeSupplier('wild-bare')

        const response = await get(
          `/suppliers?search=${encodeURIComponent(term)}`,
        )

        expect(response.status).toBe(200)
        expect(response.body.data).toEqual([])
      },
    )

    it('pages the results and reports the totals', async () => {
      await makeSupplier('page-a', {
        scope: 'paging',
        submittedAt: '2026-08-01T00:00:00Z',
      })
      await makeSupplier('page-b', {
        scope: 'paging',
        submittedAt: '2026-08-02T00:00:00Z',
      })
      await makeSupplier('page-c', {
        scope: 'paging',
        submittedAt: '2026-08-03T00:00:00Z',
      })
      const all = await list('paging', '&limit=30')
      const total = all.body.pagingMeta.totalItem as number
      expect(total).toBe(3)

      const second = await list('paging', '&page=2&limit=2')

      expect(second.body.data).toHaveLength(1)
      expect(second.body.pagingMeta).toMatchObject({
        page: 2,
        limit: 2,
        totalItem: total,
        totalPage: Math.ceil(total / 2),
        hasPreviousPage: true,
      })
      expect(second.body.data.map((r: { id: string }) => r.id)).toEqual(
        all.body.data.slice(2, 4).map((r: { id: string }) => r.id),
      )
    })

    it('sorts by business name and by submitted date, in the order asked', async () => {
      const b = await makeSupplier('sort-b', {
        scope: 'sort',
        submittedAt: '2026-08-01T00:00:00Z',
      })
      const a = await makeSupplier('sort-a', {
        scope: 'sort',
        submittedAt: '2026-08-09T00:00:00Z',
      })

      const ids = async (query: string) =>
        (await list('sort', `&limit=30&${query}`)).body.data
          .map((r: { id: string }) => r.id)
          .filter((id: string) => id === a.id || id === b.id)

      expect(await ids('orderField=business_name&order=ASC')).toEqual([
        a.id,
        b.id,
      ])
      expect(await ids('orderField=business_name&order=DESC')).toEqual([
        b.id,
        a.id,
      ])
      expect(await ids('orderField=submitted_at&order=ASC')).toEqual([
        b.id,
        a.id,
      ])
      expect(await ids('orderField=submitted_at&order=DESC')).toEqual([
        a.id,
        b.id,
      ])
    })

    it.each([
      ['an unknown status', 'status=maybe'],
      ['an unknown sort field', 'orderField=password_hash'],
      ['an unknown sort order', 'order=sideways'],
      ['a limit of 0', 'limit=0'],
      ['a limit over 30', 'limit=31'],
      ['a search over 100 characters', `search=${'a'.repeat(101)}`],
    ])('rejects %s', async (_label, query) => {
      const response = await get(`/suppliers?${query}`)

      expect(response.status).toBe(400)
    })
  })

  describe('GET /suppliers/summary', () => {
    it('counts every status and moves with the applications', async () => {
      const before = (await get('/suppliers/summary')).body

      await makeSupplier('sum-p1')
      await makeSupplier('sum-p2')
      await makeSupplier('sum-p3')
      await makeSupplier('sum-a1', {
        status: 'approved',
        reviewedAt: '2026-08-02T00:00:00Z',
      })
      await makeSupplier('sum-a2', {
        status: 'approved',
        reviewedAt: '2026-08-02T00:00:00Z',
      })
      await makeSupplier('sum-r', {
        status: 'rejected',
        reviewedAt: '2026-08-02T00:00:00Z',
        rejectionReason: 'x',
      })
      const after = (await get('/suppliers/summary')).body

      expect(after).toEqual({
        all: before.all + 6,
        pendingReview: before.pendingReview + 3,
        approved: before.approved + 2,
        rejected: before.rejected + 1,
      })
    })

    it('does not change with a filter, a page or a search', async () => {
      const plain = await get('/suppliers/summary')
      const filtered = await get(
        '/suppliers/summary?status=approved&search=zzz&page=3',
      )

      expect(filtered.body).toEqual(plain.body)
    })
  })

  describe('GET /suppliers/:supplierId', () => {
    it('shows a pending application with no reviewer and no categories yet', async () => {
      const supplier = await makeSupplier('detail-pend', {
        firstName: 'Ravi',
        lastName: 'Patel',
        abn: '44000000012',
      })

      const response = await get(`/suppliers/${supplier.id}`)

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        id: supplier.id,
        businessName: supplier.name,
        abn: '44000000012',
        businessType: 'Test business',
        contactName: 'Ravi Patel',
        contactEmail: supplier.email,
        contactPhone: '0400 000 000',
        productCategories: [],
        status: 'pending_review',
        submittedAt: '2026-08-01T00:00:00.000Z',
        reviewedAt: null,
        rejectionReason: null,
        reviewedByName: null,
      })
    })

    it('shows a decided application with its reason and the admin who decided it', async () => {
      const supplier = await makeSupplier('detail-rej', {
        status: 'rejected',
        reviewedAt: '2026-08-04T00:00:00Z',
        rejectionReason: 'ABN could not be verified',
      })
      await dataSource.query(
        `UPDATE supplier_profile SET approved_by_user_id = $2 WHERE id = $1`,
        [supplier.id, admin.id],
      )

      const response = await get(`/suppliers/${supplier.id}`)

      expect(response.body).toMatchObject({
        status: 'rejected',
        reviewedAt: '2026-08-04T00:00:00.000Z',
        rejectionReason: 'ABN could not be verified',
        reviewedByName: admin.fullName,
      })
    })

    it("lists the top-level categories of the supplier's products, rolled up, sorted, without retired ones", async () => {
      const supplier = await makeSupplier('detail-cat', {
        status: 'approved',
        reviewedAt: '2026-08-02T00:00:00Z',
      })
      await addProduct(supplier, 'urine-collection')
      await addProduct(supplier, 'collection-kits')
      await addProduct(supplier, 'ppe', 'draft')
      await addProduct(supplier, 'oral-fluid')
      await addProduct(supplier, 'supplies', 'retired')

      const response = await get(`/suppliers/${supplier.id}`)

      expect(response.body.productCategories).toEqual([
        'Collection Kits',
        'PPE',
        'Rapid Tests',
      ])
    })

    it('never includes a password or a hash', async () => {
      const supplier = await makeSupplier('detail-secret')

      const response = await get(`/suppliers/${supplier.id}`)

      expect(JSON.stringify(response.body)).not.toMatch(/\$2b\$|password/i)
    })

    it('answers 404 for an application that does not exist and 400 for a malformed id', async () => {
      const missing = await get(
        '/suppliers/00000000-0000-4000-8000-000000000000',
      )
      const malformed = await get('/suppliers/not-a-uuid')

      expect(missing.status).toBe(404)
      expect(missing.body.error).toBe('ECB404')
      expect(malformed.status).toBe(400)
    })
  })

  describe('POST /suppliers/:supplierId/approve', () => {
    it('approves a pending application and returns the refreshed screen', async () => {
      const supplier = await makeSupplier('appr')
      const started = Date.now()

      const response = await approve(supplier.id)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        id: supplier.id,
        status: 'approved',
        rejectionReason: null,
        reviewedByName: admin.fullName,
      })
      const row = await profileRow(supplier.id)
      expect(row.status).toBe('approved')
      expect(row.approvedByUserId).toBe(admin.id)
      expect(row.rejectionReason).toBeNull()
      expect(row.approvedAt).not.toBeNull()
      const reviewedAt = row.reviewedAt?.getTime() ?? 0
      expect(reviewedAt).toBe(row.approvedAt?.getTime())
      expect(reviewedAt).toBeGreaterThanOrEqual(started - 1000)
      expect(new Date(response.body.reviewedAt).getTime()).toBe(reviewedAt)
    })

    it('clears a stale rejection reason, so an approved application never carries one', async () => {
      const supplier = await makeSupplier('appr-stale')
      await dataSource.query(
        `UPDATE supplier_profile SET rejection_reason = 'Old reason' WHERE id = $1`,
        [supplier.id],
      )

      const response = await approve(supplier.id)

      expect(response.status).toBe(200)
      expect(response.body.rejectionReason).toBeNull()
      expect((await profileRow(supplier.id)).rejectionReason).toBeNull()
    })

    it('leaves the original submission time and every other application alone', async () => {
      const target = await makeSupplier('appr-iso', {
        submittedAt: '2026-07-07T00:00:00Z',
      })
      const bystander = await makeSupplier('appr-bystander')

      await approve(target.id)

      expect((await profileRow(target.id)).submittedAt.toISOString()).toBe(
        '2026-07-07T00:00:00.000Z',
      )
      expect((await profileRow(bystander.id)).status).toBe('pending_review')
    })

    it('emails the contact, once, saying they can sign in', async () => {
      const supplier = await makeSupplier('appr-mail')

      await approve(supplier.id)

      expect(mail).toHaveBeenCalledTimes(1)
      const message = mail.mock.calls[0][0]
      expect(message.to).toBe(supplier.email)
      expect(message.subject).toContain(supplier.name)
      expect(message.text).toContain('approved')
      expect(message.text).toContain('Sam')
    })

    it('refuses an application that was already decided, changing and sending nothing', async () => {
      const approved = await makeSupplier('appr-twice', {
        status: 'approved',
        reviewedAt: '2026-08-02T00:00:00Z',
      })
      const rejected = await makeSupplier('appr-after-rej', {
        status: 'rejected',
        reviewedAt: '2026-08-02T00:00:00Z',
        rejectionReason: 'Original reason',
      })
      const approvedBefore = await profileRow(approved.id)
      const rejectedBefore = await profileRow(rejected.id)

      const again = await approve(approved.id)
      const afterReject = await approve(rejected.id)

      expect(again.status).toBe(409)
      expect(again.body.error).toBe('ECB409')
      expect(afterReject.status).toBe(409)
      expect(await profileRow(approved.id)).toEqual(approvedBefore)
      expect(await profileRow(rejected.id)).toEqual(rejectedBefore)
      expect(mail).not.toHaveBeenCalled()
    })

    it('answers 404 for an application that does not exist, sending nothing', async () => {
      const response = await approve('00000000-0000-4000-8000-000000000000')

      expect(response.status).toBe(404)
      expect(mail).not.toHaveBeenCalled()
    })

    it('lets exactly one of two simultaneous approvals through', async () => {
      const supplier = await makeSupplier('appr-race')

      const results = await Promise.all([
        approve(supplier.id),
        approve(supplier.id),
      ])

      expect(results.map((r) => r.status).sort()).toEqual([200, 409])
      expect(mail).toHaveBeenCalledTimes(1)
    })

    it('can decide an application again once the seller has resubmitted it', async () => {
      const supplier = await makeSupplier('appr-resubmit', {
        status: 'rejected',
        reviewedAt: '2026-08-02T00:00:00Z',
        rejectionReason: 'Fix the ABN',
      })
      // What the seller's resubmit does: back to pending, with the decision cleared.
      await dataSource.query(
        `UPDATE supplier_profile
         SET status = 'pending_review', reviewed_at = NULL, rejection_reason = NULL,
             approved_by_user_id = NULL, submitted_at = now()
         WHERE id = $1`,
        [supplier.id],
      )

      const response = await approve(supplier.id)

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('approved')
    })
  })

  describe('POST /suppliers/:supplierId/reject', () => {
    it('stores the reason as the applicant will read it and records who decided', async () => {
      const supplier = await makeSupplier('rej')

      const response = await reject(supplier.id, { reason: 'abn_not_verified' })

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        status: 'rejected',
        rejectionReason: 'ABN could not be verified',
        reviewedByName: admin.fullName,
      })
      const row = await profileRow(supplier.id)
      expect(row.status).toBe('rejected')
      expect(row.rejectionReason).toBe('ABN could not be verified')
      expect(row.approvedByUserId).toBe(admin.id)
      expect(row.approvedAt).toBeNull()
      expect(row.reviewedAt).not.toBeNull()
    })

    it.each([
      ['abn_not_verified', 'ABN could not be verified'],
      ['business_details_incomplete', 'Business details are incomplete'],
      [
        'not_eligible_supplier',
        'Not an eligible supplier for this marketplace',
      ],
    ])('stores %s as its label', async (reason, label) => {
      const supplier = await makeSupplier(`rej-${reason}`)

      await reject(supplier.id, { reason })

      expect((await profileRow(supplier.id)).rejectionReason).toBe(label)
    })

    it('adds the trimmed detail after the reason', async () => {
      const supplier = await makeSupplier('rej-detail')

      await reject(supplier.id, {
        reason: 'business_details_incomplete',
        detail: '  Add your business type.  ',
      })

      expect((await profileRow(supplier.id)).rejectionReason).toBe(
        'Business details are incomplete. Add your business type.',
      )
    })

    it('treats a blank detail as no detail', async () => {
      const supplier = await makeSupplier('rej-blank')

      await reject(supplier.id, { reason: 'abn_not_verified', detail: '   ' })

      expect((await profileRow(supplier.id)).rejectionReason).toBe(
        'ABN could not be verified',
      )
    })

    it('requires a detail for "other", and says so before touching anything', async () => {
      const supplier = await makeSupplier('rej-other')

      const bare = await reject(supplier.id, { reason: 'other' })
      const blank = await reject(supplier.id, { reason: 'other', detail: '  ' })

      expect(bare.status).toBe(400)
      expect(blank.status).toBe(400)
      expect(bare.body.message).toContain('detail')
      expect((await profileRow(supplier.id)).status).toBe('pending_review')
      expect(mail).not.toHaveBeenCalled()

      const ok = await reject(supplier.id, {
        reason: 'other',
        detail: 'Not a medical supplier.',
      })
      expect(ok.status).toBe(200)
      expect((await profileRow(supplier.id)).rejectionReason).toBe(
        'Other. Not a medical supplier.',
      )
    })

    it.each([
      ['no reason', {}],
      ['an unknown reason', { reason: 'because' }],
      [
        'a detail over 1000 characters',
        { reason: 'abn_not_verified', detail: 'x'.repeat(1001) },
      ],
      [
        'a reviewer in the body',
        { reason: 'abn_not_verified', reviewedAt: '2020-01-01' },
      ],
      [
        'the stored reason in the body',
        { reason: 'abn_not_verified', rejectionReason: 'mine' },
      ],
    ])('rejects %s without changing the application', async (_label, body) => {
      const supplier = await makeSupplier('rej-bad')

      const response = await reject(supplier.id, body)

      expect(response.status).toBe(400)
      expect((await profileRow(supplier.id)).status).toBe('pending_review')
      expect(mail).not.toHaveBeenCalled()
    })

    it('accepts a detail of exactly 1000 characters', async () => {
      const supplier = await makeSupplier('rej-long')

      const response = await reject(supplier.id, {
        reason: 'abn_not_verified',
        detail: 'x'.repeat(1000),
      })

      expect(response.status).toBe(200)
    })

    it('emails the contact the reason and that they can resubmit', async () => {
      const supplier = await makeSupplier('rej-mail')

      await reject(supplier.id, {
        reason: 'abn_not_verified',
        detail: 'Check the digits.',
      })

      expect(mail).toHaveBeenCalledTimes(1)
      const message = mail.mock.calls[0][0]
      expect(message.to).toBe(supplier.email)
      expect(message.text).toContain(
        'ABN could not be verified. Check the digits.',
      )
      expect(message.text).toContain('resubmit')
    })

    it('refuses an application that was already decided, changing and sending nothing', async () => {
      const rejected = await makeSupplier('rej-twice', {
        status: 'rejected',
        reviewedAt: '2026-08-02T00:00:00Z',
        rejectionReason: 'Original reason',
      })
      const approved = await makeSupplier('rej-after-appr', {
        status: 'approved',
        reviewedAt: '2026-08-02T00:00:00Z',
      })
      const rejectedBefore = await profileRow(rejected.id)
      const approvedBefore = await profileRow(approved.id)

      const again = await reject(rejected.id, { reason: 'abn_not_verified' })
      const afterApprove = await reject(approved.id, {
        reason: 'abn_not_verified',
      })

      expect(again.status).toBe(409)
      expect(afterApprove.status).toBe(409)
      expect(await profileRow(rejected.id)).toEqual(rejectedBefore)
      expect(await profileRow(approved.id)).toEqual(approvedBefore)
      expect(mail).not.toHaveBeenCalled()
    })

    it('answers 404 for an application that does not exist', async () => {
      const response = await reject('00000000-0000-4000-8000-000000000000', {
        reason: 'abn_not_verified',
      })

      expect(response.status).toBe(404)
    })

    it('lets exactly one of a simultaneous approval and rejection win, and the stored state agrees', async () => {
      const supplier = await makeSupplier('race-mixed')

      const [approved, rejected] = await Promise.all([
        approve(supplier.id),
        reject(supplier.id, { reason: 'abn_not_verified' }),
      ])

      expect([approved.status, rejected.status].sort()).toEqual([200, 409])
      const row = await profileRow(supplier.id)
      if (approved.status === 200) {
        expect(row.status).toBe('approved')
        expect(row.rejectionReason).toBeNull()
      } else {
        expect(row.status).toBe('rejected')
        expect(row.approvedAt).toBeNull()
      }
      expect(mail).toHaveBeenCalledTimes(1)
    })
  })
})
