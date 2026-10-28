// The suite logs in a lot; the rate limit has its own spec.
process.env.AUTH_THROTTLE_LIMIT = '1000'

import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AllExceptionsFilter } from '@sa-marketplace/common'
import { SupplierProfile } from '@sa-marketplace/entities'
import * as request from 'supertest'
import { DataSource, EntityManager } from 'typeorm'
import { API_PREFIX } from '../src/app.constant'
import { AppModule } from '../src/app.module'
import { AppValidationPipe } from '../src/app.pipe'

// Requires the local database: pnpm db:up, pnpm db:seed. Sellers and orders are created per run
// and removed in afterAll. The seeded seller is only read, to guard the seeded password length.
describe('Seller business profile (e2e)', () => {
  let app: INestApplication
  let dataSource: DataSource

  const base = '/api/supplier/v1'
  const run = Date.now()
  const password = 'Sup3rSecret!'
  const createdEmails: string[] = []
  const createdOrderNumbers: string[] = []
  let sellerCount = 0
  let orderCount = 0
  let productCount = 0

  let buyerId: string
  let seededProductId: string

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` })
  const http = () => request(app.getHttpServer())
  const getProfile = (token: string) =>
    http().get(`${base}/auth/profile`).set(auth(token))
  const patchProfile = (token: string, body: Record<string, unknown> = {}) =>
    http().patch(`${base}/auth/profile`).set(auth(token)).send(body)
  const changePassword = (token: string, body: Record<string, unknown>) =>
    http().post(`${base}/auth/change-password`).set(auth(token)).send(body)
  const login = (email: string, secret = password) =>
    http().post(`${base}/auth/login`).send({ email, password: secret })

  type Seller = { email: string; token: string; profileId: string }

  // Registers a real seller; `state` forces its application status.
  const makeSeller = async (
    label: string,
    state: 'approved' | 'pending' | 'rejected' = 'approved',
  ): Promise<Seller> => {
    sellerCount += 1
    const email =
      `e2e.prof.${label}.${sellerCount}.${run}@example.com`.toLowerCase()
    createdEmails.push(email)

    const registered = await http()
      .post(`${base}/auth/register`)
      .send({
        businessName: `E2E Prof ${label} ${run}`,
        abn: '51824753556',
        businessType: 'Private company',
        contactName: 'Jamie Lee',
        email,
        password,
        phone: '0400 111 222',
        confirmAuthorised: true,
      })

    if (state !== 'pending') {
      await dataSource.query(
        `UPDATE supplier_profile SET status = $2, reviewed_at = now()
         WHERE user_id = (SELECT id FROM "user" WHERE email = $1)`,
        [email, state],
      )
    }
    if (state === 'approved') {
      await dataSource.query(
        `UPDATE supplier_profile SET approved_at = '2026-01-01T00:00:00Z'
         WHERE user_id = (SELECT id FROM "user" WHERE email = $1)`,
        [email],
      )
    }
    const [{ id }] = await dataSource.query(
      `SELECT sp.id FROM supplier_profile sp
       JOIN "user" u ON u.id = sp.user_id WHERE u.email = $1`,
      [email],
    )
    return { email, token: registered.body.access_token, profileId: id }
  }

  const rows = async (email: string) => {
    const [row] = await dataSource.query(
      `SELECT u.first_name AS "firstName", u.last_name AS "lastName", u.phone, u.email,
              u.password_hash AS "passwordHash", u.password_length AS "passwordLength",
              u.updated_at AS "userUpdatedAt",
              sp.business_name AS "businessName", sp.abn, sp.business_type AS "businessType",
              sp.dispatch_sla_hours AS "dispatchSlaHours", sp.default_carrier AS "defaultCarrier",
              sp.status, sp.updated_at AS "profileUpdatedAt"
       FROM "user" u JOIN supplier_profile sp ON sp.user_id = u.id WHERE u.email = $1`,
      [email],
    )
    return row as Record<string, unknown>
  }

  // A product in the category with this slug; `status` is its listing status.
  const addProduct = async (
    seller: Seller,
    categorySlug: string,
    status: 'draft' | 'published' | 'retired' = 'published',
  ): Promise<void> => {
    productCount += 1
    await dataSource.query(
      `INSERT INTO product (supplier_profile_id, category_id, name, sku, price, quantity,
                            low_stock_threshold, listing_status)
       VALUES ($1, (SELECT id FROM category WHERE slug = $2), 'E2E product', $3, 5.00, 10, 2, $4)`,
      [
        seller.profileId,
        categorySlug,
        `E2E-CAT-${run}-${productCount}`,
        status,
      ],
    )
  }

  // An order awaiting dispatch, placed `hoursAgo` hours ago.
  const addOrder = async (seller: Seller, hoursAgo = 5): Promise<string> => {
    orderCount += 1
    const orderNumber = `ORD-2097-${(run % 80000) + 10000 + orderCount}`
    createdOrderNumbers.push(orderNumber)
    const [{ id: orderId }] = await dataSource.query(
      `INSERT INTO "order" (order_number, user_id, supplier_profile_id, status, subtotal,
                            gst_total, total, placed_at)
       VALUES ($1, $2, $3, 'placed', 9.00, 1.00, 10.00, now() - make_interval(hours => $4))
       RETURNING id`,
      [orderNumber, buyerId, seller.profileId, hoursAgo],
    )
    await dataSource.query(
      `INSERT INTO order_item (order_id, product_id, product_name, sku, quantity,
                               unit_price_at_purchase, line_total)
       VALUES ($1, $2, 'E2E item', 'E2E-PROF', 1, 1.00, 1.00)`,
      [orderId, seededProductId],
    )
    await dataSource.query(
      `INSERT INTO delivery (order_id, street_address, suburb, state, postcode)
       VALUES ($1, '1 Test St', 'Parramatta', 'NSW', '2150')`,
      [orderId],
    )
    return orderNumber
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
    // Bound to loopback, not supertest's wildcard: a random wildcard port can collide with
    // a server another program holds on 127.0.0.1, which then answers with an empty 404.
    await app.listen(0, '127.0.0.1')

    dataSource = app.get(DataSource)
    buyerId = (
      await dataSource.query(
        `SELECT id FROM "user" WHERE email = 'j.shaw@saclinics.com.au'`,
      )
    )[0].id
    seededProductId = (
      await dataSource.query(`SELECT id FROM product WHERE sku = 'COC-004'`)
    )[0].id
  })

  afterAll(async () => {
    const orders = `SELECT id FROM "order" WHERE order_number = ANY($1)`
    await dataSource.query(
      `DELETE FROM delivery WHERE order_id IN (${orders})`,
      [createdOrderNumbers],
    )
    await dataSource.query(
      `DELETE FROM order_item WHERE order_id IN (${orders})`,
      [createdOrderNumbers],
    )
    await dataSource.query(`DELETE FROM "order" WHERE order_number = ANY($1)`, [
      createdOrderNumbers,
    ])
    const ids = `SELECT id FROM "user" WHERE email = ANY($1)`
    await dataSource.query(
      `DELETE FROM product WHERE supplier_profile_id IN (SELECT id FROM supplier_profile WHERE user_id IN (${ids}))`,
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

  describe('access', () => {
    const routes: [string, string][] = [
      ['get', '/auth/profile'],
      ['patch', '/auth/profile'],
      ['post', '/auth/change-password'],
    ]

    it.each(routes)('refuses %s %s with no token', async (method, path) => {
      const response = await http()[method as 'get'](`${base}${path}`)

      expect(response.status).toBe(401)
    })

    // The profile belongs to the approved portal; changing a password does not.
    it.each([['pending'], ['rejected']] as const)(
      'keeps a %s seller out of the profile, with the approval message',
      async (state) => {
        const seller = await makeSeller(`access-${state}`, state)

        const read = await getProfile(seller.token)
        const write = await patchProfile(seller.token, {
          phone: '0411 000 000',
        })

        expect(read.status).toBe(403)
        expect(write.status).toBe(403)
        expect(read.body.message).toBe(
          'Your supplier application has not been approved yet',
        )
        expect((await rows(seller.email)).phone).toBe('0400 111 222')
      },
    )

    it('lets a seller who is still pending change their password', async () => {
      const seller = await makeSeller('access-pending-password', 'pending')

      const response = await changePassword(seller.token, {
        newPassword: 'Another1Pass!',
      })

      expect(response.status).toBe(200)
      expect(response.body.access_token).toEqual(expect.any(String))
      expect((await login(seller.email, 'Another1Pass!')).status).toBe(200)
    })
  })

  describe('GET /auth/profile', () => {
    it('returns the business, contact, fulfilment and verification a seller sees', async () => {
      const seller = await makeSeller('get')

      const response = await getProfile(seller.token)

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        business: {
          businessName: `E2E Prof get ${run}`,
          abn: '51824753556',
          businessType: 'Private company',
        },
        contact: { contactName: 'Jamie Lee', phone: '0400 111 222' },
        productCategories: [],
        email: seller.email,
        passwordLength: password.length,
        fulfilment: { dispatchSlaHours: 48, defaultCarrier: null },
        verification: {
          status: 'approved',
          approvedAt: '2026-01-01T00:00:00.000Z',
        },
      })
    })

    it('never includes a password or its hash, or identifiers of other records', async () => {
      const seller = await makeSeller('get-secrets')

      const response = await getProfile(seller.token)

      const text = JSON.stringify(response.body)
      expect(text).not.toContain('$2')
      expect(text).not.toContain(password)
      expect(Object.keys(response.body).sort()).toEqual([
        'business',
        'contact',
        'email',
        'fulfilment',
        'passwordLength',
        'productCategories',
        'verification',
      ])
    })

    it("lists the top-level categories of the seller's products, rolled up and sorted", async () => {
      const seller = await makeSeller('get-categories')
      await addProduct(seller, 'urine-collection')
      await addProduct(seller, 'collection-kits')
      await addProduct(seller, 'ppe', 'draft')
      await addProduct(seller, 'oral-fluid')

      const response = await getProfile(seller.token)

      expect(response.body.productCategories).toEqual([
        'Collection Kits',
        'PPE',
        'Rapid Tests',
      ])
    })

    it('leaves a category out once all its products are retired', async () => {
      const seller = await makeSeller('get-categories-retired')
      await addProduct(seller, 'ppe', 'retired')
      await addProduct(seller, 'supplies')

      const response = await getProfile(seller.token)

      expect(response.body.productCategories).toEqual(['Supplies'])
    })

    it("does not list categories from another seller's products", async () => {
      const mine = await makeSeller('get-categories-mine')
      const other = await makeSeller('get-categories-other')
      await addProduct(other, 'ppe')

      const response = await getProfile(mine.token)

      expect(response.body.productCategories).toEqual([])
    })

    it('does not accept categories on PATCH, they follow the products', async () => {
      const seller = await makeSeller('patch-categories')

      const response = await patchProfile(seller.token, {
        productCategories: ['PPE'],
      })

      expect(response.status).toBe(400)
    })

    it('shows each seller only their own profile, whatever the other has set', async () => {
      const first = await makeSeller('get-first')
      const second = await makeSeller('get-second')
      await patchProfile(second.token, {
        defaultCarrier: 'Sendle',
        dispatchSlaHours: 6,
      })

      const response = await getProfile(first.token)

      expect(response.body.business.businessName).toBe(
        `E2E Prof get-first ${run}`,
      )
      expect(response.body.fulfilment).toEqual({
        dispatchSlaHours: 48,
        defaultCarrier: null,
      })
    })

    it('reports the seeded password length truthfully, so the dots are the right number', async () => {
      const seeded = await login('priya@bindimedsupply.com.au', 'Password123!')

      const response = await getProfile(seeded.body.access_token)

      expect(response.status).toBe(200)
      expect(response.body.passwordLength).toBe('Password123!'.length)
      expect(response.body.contact.contactName).toBe('Priya Nair')
    })
  })

  describe('PATCH /auth/profile', () => {
    it('changes only what is sent, and an empty body is a no-op that writes nothing', async () => {
      const seller = await makeSeller('patch-partial')
      const before = (await getProfile(seller.token)).body
      const rowBefore = await rows(seller.email)

      const empty = await patchProfile(seller.token, {})
      const rowAfterEmpty = await rows(seller.email)
      const sla = await patchProfile(seller.token, { dispatchSlaHours: 12 })

      expect(empty.status).toBe(200)
      expect(empty.body).toEqual(before)
      expect(rowAfterEmpty.userUpdatedAt).toEqual(rowBefore.userUpdatedAt)
      expect(rowAfterEmpty.profileUpdatedAt).toEqual(rowBefore.profileUpdatedAt)
      expect(sla.body).toEqual({
        ...before,
        fulfilment: { dispatchSlaHours: 12, defaultCarrier: null },
      })
    })

    it('saves all five editable fields, trimmed, and returns the refreshed profile', async () => {
      const seller = await makeSeller('patch-all')

      const response = await patchProfile(seller.token, {
        businessType: '  Sole trader ',
        contactName: ' Priya  Q  Nair ',
        phone: ' 0411 222 333 ',
        dispatchSlaHours: 72,
        defaultCarrier: ' Sendle ',
      })

      expect(response.status).toBe(200)
      expect(response.body.business.businessType).toBe('Sole trader')
      expect(response.body.contact).toEqual({
        contactName: 'Priya Q Nair',
        phone: '0411 222 333',
      })
      expect(response.body.fulfilment).toEqual({
        dispatchSlaHours: 72,
        defaultCarrier: 'Sendle',
      })
      expect(await rows(seller.email)).toMatchObject({
        businessType: 'Sole trader',
        phone: '0411 222 333',
        dispatchSlaHours: 72,
        defaultCarrier: 'Sendle',
      })
    })

    it('splits the contact name on the last word, as registration does', async () => {
      const seller = await makeSeller('patch-name')

      await patchProfile(seller.token, {
        contactName: 'Mary Jane van der Berg',
      })

      expect(await rows(seller.email)).toMatchObject({
        firstName: 'Mary Jane van der',
        lastName: 'Berg',
      })
    })

    it('clears the business type and default carrier when they are sent blank', async () => {
      const seller = await makeSeller('patch-clear')
      await patchProfile(seller.token, { defaultCarrier: 'Sendle' })

      const response = await patchProfile(seller.token, {
        businessType: '   ',
        defaultCarrier: '',
      })

      expect(response.status).toBe(200)
      expect(response.body.business.businessType).toBeNull()
      expect(response.body.fulfilment.defaultCarrier).toBeNull()
      expect(await rows(seller.email)).toMatchObject({
        businessType: null,
        defaultCarrier: null,
      })
    })

    it.each([
      ['businessName', { businessName: 'Renamed Pty Ltd' }],
      ['abn', { abn: '11111111111' }],
      ['email', { email: 'someone.else@example.com' }],
      ['password', { password: 'Sneaky1Pass!' }],
      ['passwordHash', { passwordHash: 'x' }],
      ['status', { status: 'approved' }],
      ['timezone', { timezone: 'Pacific/Auckland' }],
      ['approvedAt', { approvedAt: '2020-01-01T00:00:00Z' }],
    ])(
      'refuses to change %s: identity the admin verified, and sign-in',
      async (field, body) => {
        const seller = await makeSeller(`patch-identity-${field}`)
        const before = await rows(seller.email)

        const response = await patchProfile(seller.token, body)

        expect(response.status).toBe(400)
        expect(response.body.message).toContain(
          `property ${field} should not exist`,
        )
        const after = await rows(seller.email)
        expect(after).toEqual(before)
      },
    )

    it.each([
      ['an SLA of 0', { dispatchSlaHours: 0 }],
      ['an SLA over a week', { dispatchSlaHours: 169 }],
      ['an SLA that is not whole hours', { dispatchSlaHours: 1.5 }],
      ['an SLA that is not a number', { dispatchSlaHours: 'soon' }],
      ['a negative SLA', { dispatchSlaHours: -4 }],
      ['a one-word contact name', { contactName: 'Priya' }],
      ['a blank phone', { phone: '' }],
      [
        'a business type over 100 characters',
        { businessType: 'x'.repeat(101) },
      ],
      [
        'a default carrier over 100 characters',
        { defaultCarrier: 'x'.repeat(101) },
      ],
      [
        'a first name over 100 characters',
        { contactName: `${'a'.repeat(101)} Lee` },
      ],
      [
        'a last name over 100 characters',
        { contactName: `Jamie ${'b'.repeat(101)}` },
      ],
    ])('refuses %s, and writes nothing', async (_label, body) => {
      const seller = await makeSeller('patch-invalid')
      const before = await rows(seller.email)

      const response = await patchProfile(seller.token, {
        phone: '0499 000 000',
        ...body,
      })

      expect(response.status).toBe(400)
      expect(await rows(seller.email)).toEqual(before)
    })

    it('accepts the edges: an SLA of 1 and of 168 hours, and the longest allowed text, names included', async () => {
      const seller = await makeSeller('patch-edges')

      const low = await patchProfile(seller.token, { dispatchSlaHours: 1 })
      const high = await patchProfile(seller.token, {
        dispatchSlaHours: 168,
        businessType: 'x'.repeat(100),
        defaultCarrier: 'y'.repeat(100),
        contactName: `${'a'.repeat(100)} ${'b'.repeat(100)}`,
      })

      expect(low.body.fulfilment.dispatchSlaHours).toBe(1)
      expect(high.status).toBe(200)
      expect(high.body.fulfilment.dispatchSlaHours).toBe(168)
    })

    it('saves the user and the business together or not at all', async () => {
      const seller = await makeSeller('patch-atomic')
      const before = await rows(seller.email)

      // Fail only the business write, which runs second, after the phone has been updated.
      const original = EntityManager.prototype.update
      const spy = jest
        .spyOn(EntityManager.prototype, 'update')
        .mockImplementation(function (this: EntityManager, target, ...rest) {
          if (target === SupplierProfile) {
            throw new Error('simulated business update failure')
          }
          return original.call(this, target, ...(rest as [never, never]))
        })

      let response: request.Response
      try {
        response = await patchProfile(seller.token, {
          phone: '0400 999 888',
          dispatchSlaHours: 10,
        })
      } finally {
        spy.mockRestore()
      }

      expect(response.status).toBe(500)
      const after = await rows(seller.email)
      expect(after.phone).toBe(before.phone)
      expect(after.dispatchSlaHours).toBe(before.dispatchSlaHours)
    })

    it('does not touch another seller when one saves', async () => {
      const mine = await makeSeller('patch-isolated')
      const theirs = await makeSeller('patch-isolated-other')
      const before = await rows(theirs.email)

      await patchProfile(mine.token, {
        phone: '0400 777 666',
        dispatchSlaHours: 5,
        defaultCarrier: 'X',
      })

      expect(await rows(theirs.email)).toEqual(before)
    })
  })

  describe('what the settings change elsewhere', () => {
    const queueRow = async (seller: Seller, orderNumber: string) => {
      const response = await http()
        .get(`${base}/dashboard/orders-requiring-dispatch`)
        .set(auth(seller.token))
      return response.body.data.find(
        (row: { orderNumber: string }) => row.orderNumber === orderNumber,
      ) as { placedAt: string; slaDueAt: string }
    }
    const hoursBetween = (from: string, to: string) =>
      (new Date(to).getTime() - new Date(from).getTime()) / 3_600_000

    it('moves the dispatch deadline of orders already waiting, not just new ones (ADR 0037)', async () => {
      const seller = await makeSeller('effect-sla')
      const orderNumber = await addOrder(seller)

      const initial = await queueRow(seller, orderNumber)
      await patchProfile(seller.token, { dispatchSlaHours: 10 })
      const shorter = await queueRow(seller, orderNumber)
      await patchProfile(seller.token, { dispatchSlaHours: 168 })
      const longer = await queueRow(seller, orderNumber)

      expect(hoursBetween(initial.placedAt, initial.slaDueAt)).toBe(48)
      expect(hoursBetween(shorter.placedAt, shorter.slaDueAt)).toBe(10)
      expect(hoursBetween(longer.placedAt, longer.slaDueAt)).toBe(168)
    })

    it('prefills the dispatch form with the default carrier, and stops when it is cleared', async () => {
      const seller = await makeSeller('effect-carrier')
      const orderNumber = await addOrder(seller)
      const defaultCarrier = async () =>
        (
          await http()
            .get(`${base}/orders/${orderNumber}`)
            .set(auth(seller.token))
        ).body.dispatch.defaultCarrier

      expect(await defaultCarrier()).toBeNull()
      await patchProfile(seller.token, { defaultCarrier: 'Australia Post' })
      expect(await defaultCarrier()).toBe('Australia Post')
      await patchProfile(seller.token, { defaultCarrier: '' })
      expect(await defaultCarrier()).toBeNull()
    })
  })

  describe('POST /auth/change-password', () => {
    it('changes the password: the old one stops working, the new one signs in', async () => {
      const seller = await makeSeller('pw-change')
      const before = await rows(seller.email)

      const response = await changePassword(seller.token, {
        newPassword: 'NewPassw0rd!',
      })

      expect(response.status).toBe(200)
      expect(response.body.access_token).toEqual(expect.any(String))
      expect((await login(seller.email, password)).status).toBe(401)
      expect((await login(seller.email, 'NewPassw0rd!')).status).toBe(200)
      const after = await rows(seller.email)
      expect(after.passwordHash).not.toBe(before.passwordHash)
      expect(after.passwordHash).not.toBe('NewPassw0rd!')
    })

    it('keeps the session that changed it, and signs out every other one', async () => {
      const seller = await makeSeller('pw-sessions')
      const device = (await login(seller.email)).body.access_token as string

      const response = await changePassword(seller.token, {
        newPassword: 'NewPassw0rd!',
      })
      const fresh = response.body.access_token as string

      expect((await getProfile(seller.token)).status).toBe(401)
      expect((await getProfile(device)).status).toBe(401)
      expect((await getProfile(fresh)).status).toBe(200)
    })

    it('does not sign anyone else out', async () => {
      const seller = await makeSeller('pw-isolated')
      const bystander = await makeSeller('pw-bystander')

      await changePassword(seller.token, { newPassword: 'NewPassw0rd!' })

      expect((await getProfile(bystander.token)).status).toBe(200)
    })

    it('keeps the stored length in step, so the dots follow the real password', async () => {
      const seller = await makeSeller('pw-length')

      const response = await changePassword(seller.token, {
        newPassword: 'AMuchLongerPassw0rd!',
      })
      const profile = await getProfile(response.body.access_token)

      expect(profile.body.passwordLength).toBe('AMuchLongerPassw0rd!'.length)
      expect((await rows(seller.email)).passwordLength).toBe(
        'AMuchLongerPassw0rd!'.length,
      )
    })

    it('refuses the same password, and leaves the session alone', async () => {
      const seller = await makeSeller('pw-same')

      const response = await changePassword(seller.token, {
        newPassword: password,
      })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe(
        'New password must be different from the current password',
      )
      expect((await getProfile(seller.token)).status).toBe(200)
    })

    it.each([
      ['no new password', {}],
      ['a weak one', { newPassword: 'weak' }],
      ['one with no symbol', { newPassword: 'NoSymbol123' }],
      ['one with no number', { newPassword: 'NoNumber!!!' }],
    ])('refuses %s', async (_label, body) => {
      const seller = await makeSeller('pw-weak')

      const response = await changePassword(seller.token, body)

      expect(response.status).toBe(400)
      expect((await login(seller.email)).status).toBe(200)
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
        const seller = await makeSeller('pw-fields')

        const response = await changePassword(seller.token, body)

        expect(response.status).toBe(400)
        expect(response.body.message).toContain(
          `property ${field} should not exist`,
        )
        expect((await login(seller.email)).status).toBe(200)
      },
    )
  })
})
