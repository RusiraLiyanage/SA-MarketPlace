// The suite logs in a lot; the rate limit has its own spec.
process.env.AUTH_THROTTLE_LIMIT = '1000'

import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AllExceptionsFilter } from '@sa-marketplace/common'
import * as request from 'supertest'
import { DataSource } from 'typeorm'
import { API_PREFIX } from '../src/app.constant'
import { AppModule } from '../src/app.module'
import { AppValidationPipe } from '../src/app.pipe'

// Requires the local database: pnpm db:up, pnpm db:seed. Everything is created with SQL and removed
// in afterAll; seeded sellers are untouched (seeded buyer/product only satisfy FKs).
describe('Supplier dashboard (e2e)', () => {
  let app: INestApplication
  let dataSource: DataSource

  const base = '/api/supplier/v1'
  const run = Date.now()
  const createdEmails: string[] = []
  const createdOrderNumbers: string[] = []
  const createdProductIds: string[] = []
  let sellerCount = 0
  let orderCount = 0

  let buyerId: string
  let organisationId: string
  let seededProductId: string
  let categoryId: string

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` })
  const overview = (token: string) =>
    request(app.getHttpServer())
      .get(`${base}/dashboard/overview`)
      .set(auth(token))
  const queue = (token: string, query: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .get(`${base}/dashboard/orders-requiring-dispatch`)
      .query(query)
      .set(auth(token))

  type Seller = { email: string; token: string; profileId: string }

  // Registers a real seller; `state` forces its application status.
  const makeSeller = async (
    label: string,
    state: 'approved' | 'pending' | 'rejected' = 'approved',
  ): Promise<Seller> => {
    sellerCount += 1
    const email = `e2e.dash.${label}.${sellerCount}.${run}@example.com`
    createdEmails.push(email)

    const registered = await request(app.getHttpServer())
      .post(`${base}/auth/register`)
      .send({
        businessName: `E2E Dash ${label} ${run}`,
        abn: '51824753556',
        contactName: 'Jamie Lee',
        email,
        password: 'Sup3rSecret!',
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
    const [{ id }] = await dataSource.query(
      `SELECT sp.id FROM supplier_profile sp
       JOIN "user" u ON u.id = sp.user_id WHERE u.email = $1`,
      [email],
    )
    return { email, token: registered.body.access_token, profileId: id }
  }

  // An order for `profileId` placed `hoursAgo` hours ago, with one line per entry
  // of `lines` (its quantity), and a delivery row.
  const addOrder = async (
    profileId: string,
    status: string,
    options: {
      hoursAgo?: number
      lines?: number[]
      withOrganisation?: boolean
      dispatchedAt?: string
    } = {},
  ): Promise<string> => {
    const { hoursAgo = 1, lines = [1], withOrganisation = true } = options
    orderCount += 1
    const orderNumber = `ORD-T${String(run).slice(-5)}-${orderCount}`
    createdOrderNumbers.push(orderNumber)

    const [{ id: orderId }] = await dataSource.query(
      `INSERT INTO "order" (order_number, user_id, organisation_id, supplier_profile_id,
                            status, subtotal, gst_total, total, placed_at)
       VALUES ($1, $2, $3, $4, $5, 10.00, 1.00, 11.00, now() - make_interval(hours => $6))
       RETURNING id`,
      [
        orderNumber,
        buyerId,
        withOrganisation ? organisationId : null,
        profileId,
        status,
        hoursAgo,
      ],
    )
    for (const quantity of lines) {
      await dataSource.query(
        `INSERT INTO order_item (order_id, product_id, product_name, sku, quantity,
                                 unit_price_at_purchase, line_total)
         VALUES ($1, $2, 'E2E item', 'E2E-ITEM', $3::int, 1.00, $3::int)`,
        [orderId, seededProductId, quantity],
      )
    }
    await dataSource.query(
      `INSERT INTO delivery (order_id, street_address, suburb, state, postcode, dispatched_at)
       VALUES ($1, '1 Test St', 'Parramatta', 'NSW', '2150', $2)`,
      [orderId, options.dispatchedAt ?? null],
    )
    return orderNumber
  }

  const addProduct = async (
    profileId: string,
    listingStatus: 'published' | 'draft' | 'retired',
    quantity: number,
    lowStockThreshold: number,
  ) => {
    const [{ id }] = await dataSource.query(
      `INSERT INTO product (supplier_profile_id, category_id, name, sku, price,
                            quantity, low_stock_threshold, listing_status)
       VALUES ($1, $2, 'E2E product', $3, 5.00, $4, $5, $6) RETURNING id`,
      [
        profileId,
        categoryId,
        `E2E-${run}-${createdProductIds.length}`,
        quantity,
        lowStockThreshold,
        listingStatus,
      ],
    )
    createdProductIds.push(id)
  }

  // An instant, as ISO text, relative to today's calendar date in `zone`.
  const instantLocal = async (
    zone: string,
    dayOffset: number,
    time: string,
  ): Promise<string> => {
    const [{ at }] = await dataSource.query(
      `SELECT to_char(
         ((((now() AT TIME ZONE $1)::date + $2::int)::timestamp + $3::interval)
            AT TIME ZONE $1) AT TIME ZONE 'UTC',
         'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS at`,
      [zone, dayOffset, time],
    )
    return at
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
    organisationId = (
      await dataSource.query(
        `SELECT id FROM organisation WHERE name = 'SA Clinics Pty Ltd'`,
      )
    )[0].id
    seededProductId = (
      await dataSource.query(`SELECT id FROM product WHERE sku = 'COC-004'`)
    )[0].id
    categoryId = (
      await dataSource.query(`SELECT id FROM category WHERE slug = 'supplies'`)
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
    await dataSource.query(`DELETE FROM product WHERE id = ANY($1)`, [
      createdProductIds,
    ])
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

  describe('access (ApprovedSupplierGuard)', () => {
    const routes = ['overview', 'orders-requiring-dispatch']

    it.each(routes)('refuses %s with no token', async (route) => {
      const response = await request(app.getHttpServer()).get(
        `${base}/dashboard/${route}`,
      )

      expect(response.status).toBe(401)
    })

    it.each(
      routes.flatMap((route) => [
        [route, 'pending'],
        [route, 'rejected'],
      ]),
    )('refuses %s to a %s seller', async (route, state) => {
      const seller = await makeSeller(`guard-${state}`, state as 'pending')

      const response = await request(app.getHttpServer())
        .get(`${base}/dashboard/${route}`)
        .set(auth(seller.token))

      expect(response.status).toBe(403)
      expect(response.body.error).toBe('ECB403')
      expect(response.body.message).toBe(
        'Your supplier application has not been approved yet',
      )
    })

    it.each(routes)('lets an approved seller into %s', async (route) => {
      const seller = await makeSeller('guard-approved')

      const response = await request(app.getHttpServer())
        .get(`${base}/dashboard/${route}`)
        .set(auth(seller.token))

      expect(response.status).toBe(200)
    })

    it('refuses a seller whose profile has gone missing, rather than guessing', async () => {
      const seller = await makeSeller('guard-orphan')
      await dataSource.query(`DELETE FROM supplier_profile WHERE id = $1`, [
        seller.profileId,
      ])

      expect((await overview(seller.token)).status).toBe(403)
    })
  })

  describe('GET /dashboard/overview', () => {
    it('is all zeros for a seller with nothing yet, so the frontend shows the empty state', async () => {
      const seller = await makeSeller('empty')

      const response = await overview(seller.token)

      expect(response.body).toEqual({
        businessName: `E2E Dash empty ${run}`,
        newOrders: 0,
        dispatchedToday: 0,
        activeListings: 0,
        listingsNeedingAttention: 0,
      })
    })

    it('counts new orders as placed and confirmed only', async () => {
      const seller = await makeSeller('new-orders')
      await addOrder(seller.profileId, 'placed')
      await addOrder(seller.profileId, 'confirmed')
      // Already being worked on, or finished: not "new".
      for (const status of [
        'picking',
        'dispatched',
        'delivered',
        'cancelled',
      ]) {
        await addOrder(seller.profileId, status)
      }

      expect((await overview(seller.token)).body.newOrders).toBe(2)
    })

    it("never counts another seller's orders", async () => {
      const a = await makeSeller('iso-a')
      const b = await makeSeller('iso-b')
      await addOrder(a.profileId, 'placed')
      await addOrder(a.profileId, 'placed')
      await addOrder(b.profileId, 'placed')

      expect((await overview(a.token)).body.newOrders).toBe(2)
      expect((await overview(b.token)).body.newOrders).toBe(1)
    })

    it('counts only published listings as active, and flags the ones at or below their threshold', async () => {
      const seller = await makeSeller('listings')
      await addProduct(seller.profileId, 'published', 500, 50) // healthy
      await addProduct(seller.profileId, 'published', 51, 50) // just above
      await addProduct(seller.profileId, 'published', 50, 50) // exactly at threshold
      await addProduct(seller.profileId, 'published', 12, 50) // low
      await addProduct(seller.profileId, 'published', 0, 50) // out of stock
      // Not live, so not active and never "needing attention", however empty.
      await addProduct(seller.profileId, 'draft', 0, 50)
      await addProduct(seller.profileId, 'retired', 0, 50)

      const { body } = await overview(seller.token)

      expect(body.activeListings).toBe(5)
      expect(body.listingsNeedingAttention).toBe(3)
    })

    describe('dispatched today', () => {
      const dispatchedToday = async (seller: Seller) =>
        (await overview(seller.token)).body.dispatchedToday as number

      it("counts a dispatch made today in the seller's timezone, whatever its UTC date", async () => {
        const seller = await makeSeller('today')
        // 00:30 and 23:30 Sydney today: one is the previous day in UTC.
        await addOrder(seller.profileId, 'dispatched', {
          dispatchedAt: await instantLocal('Australia/Sydney', 0, '00:30'),
        })
        await addOrder(seller.profileId, 'dispatched', {
          dispatchedAt: await instantLocal('Australia/Sydney', 0, '23:30'),
        })

        expect(await dispatchedToday(seller)).toBe(2)
      })

      it('does not count yesterday or tomorrow', async () => {
        const seller = await makeSeller('not-today')
        await addOrder(seller.profileId, 'dispatched', {
          dispatchedAt: await instantLocal('Australia/Sydney', -1, '23:30'),
        })
        await addOrder(seller.profileId, 'dispatched', {
          dispatchedAt: await instantLocal('Australia/Sydney', 1, '00:30'),
        })

        expect(await dispatchedToday(seller)).toBe(0)
      })

      it('counts orders, not units, and a delivered order dispatched today still counts', async () => {
        const seller = await makeSeller('orders-not-units')
        const at = await instantLocal('Australia/Sydney', 0, '12:00')
        await addOrder(seller.profileId, 'dispatched', {
          lines: [4, 6],
          dispatchedAt: at,
        })
        await addOrder(seller.profileId, 'delivered', { dispatchedAt: at })

        expect(await dispatchedToday(seller)).toBe(2)
      })

      it('ignores an order that has no dispatch time yet', async () => {
        const seller = await makeSeller('undispatched')
        await addOrder(seller.profileId, 'picking')

        expect(await dispatchedToday(seller)).toBe(0)
      })

      it("never counts another seller's dispatches", async () => {
        const a = await makeSeller('disp-a')
        const b = await makeSeller('disp-b')
        await addOrder(a.profileId, 'dispatched', {
          dispatchedAt: await instantLocal('Australia/Sydney', 0, '12:00'),
        })

        expect(await dispatchedToday(a)).toBe(1)
        expect(await dispatchedToday(b)).toBe(0)
      })

      it("uses each supplier's own timezone: the same instant is today in Sydney but not in Perth", async () => {
        const sydney = await makeSeller('tz-sydney')
        const perth = await makeSeller('tz-perth')
        await dataSource.query(
          `UPDATE supplier_profile SET timezone = 'Australia/Perth' WHERE id = $1`,
          [perth.profileId],
        )
        // Sydney's day and Perth's day are offset, so some part of Sydney's today is not Perth's
        // today: its first hours or its last, depending on the time this runs. Take whichever
        // of 00:30 and 23:30 Sydney time is not Perth's today, so the test holds at any hour.
        const candidates = [
          await instantLocal('Australia/Sydney', 0, '00:30'),
          await instantLocal('Australia/Sydney', 0, '23:30'),
        ]
        const [{ at }] = await dataSource.query(
          `SELECT to_char(c AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS at
           FROM unnest($1::timestamptz[]) AS c
           WHERE (c AT TIME ZONE 'Australia/Perth')::date
                 <> (now() AT TIME ZONE 'Australia/Perth')::date
           LIMIT 1`,
          [candidates],
        )
        const instant: string = at
        await addOrder(sydney.profileId, 'dispatched', {
          dispatchedAt: instant,
        })
        await addOrder(perth.profileId, 'dispatched', { dispatchedAt: instant })

        expect(await dispatchedToday(sydney)).toBe(1)
        expect(await dispatchedToday(perth)).toBe(0)
      })
    })
  })

  describe('GET /dashboard/orders-requiring-dispatch', () => {
    it('is empty for a seller with nothing to dispatch', async () => {
      const seller = await makeSeller('queue-empty')

      const response = await queue(seller.token)

      expect(response.status).toBe(200)
      expect(response.body.data).toEqual([])
      expect(response.body.pagingMeta).toMatchObject({
        page: 1,
        totalItem: 0,
        totalPage: 0,
      })
    })

    it('lists orders awaiting dispatch, and no others', async () => {
      const seller = await makeSeller('queue-statuses')
      const placed = await addOrder(seller.profileId, 'placed', { hoursAgo: 5 })
      const confirmed = await addOrder(seller.profileId, 'confirmed', {
        hoursAgo: 4,
      })
      const picking = await addOrder(seller.profileId, 'picking', {
        hoursAgo: 3,
      })
      for (const status of ['dispatched', 'delivered', 'cancelled']) {
        await addOrder(seller.profileId, status)
      }

      const response = await queue(seller.token)

      expect(
        response.body.data.map((o: { orderNumber: string }) => o.orderNumber),
      ).toEqual([placed, confirmed, picking])
    })

    it("never lists another seller's orders", async () => {
      const a = await makeSeller('queue-a')
      const b = await makeSeller('queue-b')
      const mine = await addOrder(a.profileId, 'placed')
      await addOrder(b.profileId, 'placed')

      const response = await queue(a.token)

      expect(
        response.body.data.map((o: { orderNumber: string }) => o.orderNumber),
      ).toEqual([mine])
      expect(response.body.pagingMeta.totalItem).toBe(1)
    })

    it('shows the organisation, the units across all lines, and the SLA deadline', async () => {
      const seller = await makeSeller('queue-shape')
      await dataSource.query(
        `UPDATE supplier_profile SET dispatch_sla_hours = 24 WHERE id = $1`,
        [seller.profileId],
      )
      const orderNumber = await addOrder(seller.profileId, 'placed', {
        hoursAgo: 6,
        lines: [2, 3],
      })

      const [row] = (await queue(seller.token)).body.data

      expect(row).toEqual({
        orderNumber,
        organisationName: 'SA Clinics Pty Ltd',
        placedAt: expect.any(String),
        // Two lines, 2 + 3 units: the design's "5 items".
        itemCount: 5,
        slaDueAt: expect.any(String),
        slaHoursLeft: 18,
      })
      // Due exactly the seller's SLA after the order was placed.
      expect(
        new Date(row.slaDueAt).getTime() - new Date(row.placedAt).getTime(),
      ).toBe(24 * 3_600_000)
    })

    it('reports negative hours left once the SLA is overdue', async () => {
      const seller = await makeSeller('queue-overdue')
      await dataSource.query(
        `UPDATE supplier_profile SET dispatch_sla_hours = 24 WHERE id = $1`,
        [seller.profileId],
      )
      await addOrder(seller.profileId, 'placed', { hoursAgo: 30 })

      const [row] = (await queue(seller.token)).body.data

      expect(row.slaHoursLeft).toBe(-6)
    })

    it('has a null organisation name for a buyer with no organisation', async () => {
      const seller = await makeSeller('queue-no-org')
      await addOrder(seller.profileId, 'placed', { withOrganisation: false })

      const [row] = (await queue(seller.token)).body.data

      expect(row.organisationName).toBeNull()
    })

    describe('sorting and paging', () => {
      let seller: Seller
      let oldest: string
      let middle: string
      let newest: string

      beforeAll(async () => {
        seller = await makeSeller('queue-paging')
        newest = await addOrder(seller.profileId, 'placed', { hoursAgo: 1 })
        oldest = await addOrder(seller.profileId, 'placed', { hoursAgo: 9 })
        middle = await addOrder(seller.profileId, 'placed', { hoursAgo: 5 })
      })

      const numbers = (response: request.Response) =>
        response.body.data.map((o: { orderNumber: string }) => o.orderNumber)

      it('lists the oldest first by default — the one closest to breaching its SLA', async () => {
        expect(numbers(await queue(seller.token))).toEqual([
          oldest,
          middle,
          newest,
        ])
      })

      it('can list the newest first', async () => {
        expect(numbers(await queue(seller.token, { order: 'DESC' }))).toEqual([
          newest,
          middle,
          oldest,
        ])
      })

      it('pages with limit and page, with the same meta as My Orders', async () => {
        const response = await queue(seller.token, { limit: 2, page: 2 })

        expect(numbers(response)).toEqual([newest])
        expect(response.body.pagingMeta).toEqual({
          page: 2,
          limit: 2,
          totalItem: 3,
          totalPage: 2,
          hasPreviousPage: true,
          hasNextPage: false,
        })
      })

      it('rejects an orderField outside the allow-list', async () => {
        const response = await queue(seller.token, { orderField: 'id' })

        expect(response.status).toBe(400)
        expect(response.body.error).toBe('ECB001')
      })

      it('rejects a page size outside the allowed range', async () => {
        expect((await queue(seller.token, { limit: 31 })).status).toBe(400)
      })
    })
  })
})
