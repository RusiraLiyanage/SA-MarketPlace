// The suite logs in a lot; the rate limit has its own spec.
process.env.AUTH_THROTTLE_LIMIT = '1000'

import { promises as fs } from 'fs'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import {
  AllExceptionsFilter,
  MailService,
  resolveInvoicePdfPath,
  TRANSIT_DAYS,
} from '@sa-marketplace/common'
import * as request from 'supertest'
import { DataSource } from 'typeorm'
import { API_PREFIX } from '../src/app.constant'
import { AppModule } from '../src/app.module'
import { AppValidationPipe } from '../src/app.pipe'

// Requires the local database: pnpm db:up, pnpm db:seed. Sellers, products, orders, carriers and
// invoices are created per run and removed in afterAll; seeded sellers are never touched.
describe('Seller orders (e2e)', () => {
  let app: INestApplication
  let dataSource: DataSource
  const mail = { send: jest.fn() }

  const base = '/api/supplier/v1'
  const run = Date.now()
  const createdEmails: string[] = []
  const createdOrderNumbers: string[] = []
  const createdProductIds: string[] = []
  let sellerCount = 0
  let orderCount = 0
  let productCount = 0

  let buyerId: string
  let buyerEmail: string
  let organisationId: string
  let categoryId: string

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` })
  const http = () => request(app.getHttpServer())
  const carrierName = (label: string) => `E2E Carrier ${run} ${label}`

  type Seller = { email: string; token: string; profileId: string }

  // Registers a real seller; `state` forces its application status.
  const makeSeller = async (
    label: string,
    state: 'approved' | 'pending' = 'approved',
  ): Promise<Seller> => {
    sellerCount += 1
    const email = `e2e.ord.${label}.${sellerCount}.${run}@example.com`
    createdEmails.push(email)

    const registered = await http()
      .post(`${base}/auth/register`)
      .send({
        businessName: `E2E Ord ${label} ${run}`,
        abn: '51824753556',
        contactName: 'Jamie Lee',
        email,
        password: 'Sup3rSecret!',
        phone: '0400 111 222',
        confirmAuthorised: true,
      })

    if (state === 'approved') {
      await dataSource.query(
        `UPDATE supplier_profile SET status = 'approved', reviewed_at = now()
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

  type OrderStatus =
    | 'placed'
    | 'confirmed'
    | 'picking'
    | 'dispatched'
    | 'delivered'
    | 'cancelled'
  type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
  type Fixture = {
    orderNumber: string
    orderId: string
    products: { id: string; stock: number; quantity: number }[]
  }

  // An order with one line per entry of `lines` (its units), each on its own product that
  // starts with 100 in stock, a delivery row and, unless null, a payment.
  const addOrder = async (
    seller: Seller,
    status: OrderStatus,
    options: {
      hoursAgo?: number
      lines?: number[]
      total?: string
      withOrganisation?: boolean
      payment?: PaymentStatus | null
      carrier?: string
      trackingNumber?: string
      dispatchedAt?: string
      estimatedDeliveryAt?: string
      deliveredAt?: string
    } = {},
  ): Promise<Fixture> => {
    const {
      hoursAgo = 1,
      lines = [2],
      total = '11.00',
      withOrganisation = true,
    } = options
    orderCount += 1
    const orderNumber = `ORD-2099-${(run % 80000) + 10000 + orderCount}`
    createdOrderNumbers.push(orderNumber)

    const [{ id: orderId }] = await dataSource.query(
      `INSERT INTO "order" (order_number, user_id, organisation_id, supplier_profile_id,
                            status, subtotal, gst_total, total, placed_at)
       VALUES ($1, $2, $3, $4, $5, $6::numeric - 1, 1.00, $6::numeric,
               now() - make_interval(hours => $7))
       RETURNING id`,
      [
        orderNumber,
        buyerId,
        withOrganisation ? organisationId : null,
        seller.profileId,
        status,
        total,
        hoursAgo,
      ],
    )

    const products: Fixture['products'] = []
    for (const quantity of lines) {
      productCount += 1
      const [{ id: productId }] = await dataSource.query(
        `INSERT INTO product (supplier_profile_id, category_id, name, sku, price, quantity,
                              low_stock_threshold, listing_status)
         VALUES ($1, $2, $3, $4, 5.00, 100, 1, 'published') RETURNING id`,
        [
          seller.profileId,
          categoryId,
          `E2E Item ${String(productCount).padStart(4, '0')}`,
          `E2E-ORD-${run}-${productCount}`,
        ],
      )
      createdProductIds.push(productId)
      products.push({ id: productId, stock: 100, quantity })
      await dataSource.query(
        `INSERT INTO order_item (order_id, product_id, product_name, sku, quantity,
                                 unit_price_at_purchase, line_total)
         VALUES ($1, $2, $3, $4, $5::int, 1.00, $5::int)`,
        [
          orderId,
          productId,
          `E2E Item ${String(productCount).padStart(4, '0')}`,
          `E2E-ORD-${run}-${productCount}`,
          quantity,
        ],
      )
    }

    await dataSource.query(
      `INSERT INTO delivery (order_id, attention_name, street_address, suburb, state, postcode,
                             notes, carrier_id, tracking_number, dispatched_at,
                             estimated_delivery_at, delivered_at)
       VALUES ($1, 'Pat Buyer', '1 Test St', 'Parramatta', 'NSW', '2150', 'Leave at dock',
               (SELECT id FROM carrier WHERE name = $2), $3, $4, $5, $6)`,
      [
        orderId,
        options.carrier ?? null,
        options.trackingNumber ?? null,
        options.dispatchedAt ?? null,
        options.estimatedDeliveryAt ?? null,
        options.deliveredAt ?? null,
      ],
    )

    if (options.payment !== null) {
      await dataSource.query(
        `INSERT INTO payment (order_id, method, status, amount, paid_at)
         VALUES ($1, 'card_mock', $2, $3::numeric, now())`,
        [orderId, options.payment ?? 'paid', total],
      )
    }
    return { orderNumber, orderId, products }
  }

  const stockOf = async (productId: string): Promise<number> => {
    const [{ quantity }] = await dataSource.query(
      `SELECT quantity FROM product WHERE id = $1`,
      [productId],
    )
    return quantity
  }
  const orderRow = async (orderId: string) => {
    const [row] = await dataSource.query(
      `SELECT status, cancellation_reason AS "cancellationReason" FROM "order" WHERE id = $1`,
      [orderId],
    )
    return row as { status: string; cancellationReason: string | null }
  }
  const paymentStatus = async (
    orderId: string,
  ): Promise<string | undefined> => {
    const rows = await dataSource.query(
      `SELECT status FROM payment WHERE order_id = $1`,
      [orderId],
    )
    return rows[0]?.status
  }
  const deliveryRow = async (orderId: string) => {
    const [row] = await dataSource.query(
      `SELECT d.tracking_number AS "trackingNumber", c.name AS "carrierName",
              d.dispatched_at AS "dispatchedAt", d.estimated_delivery_at AS "estimatedDeliveryAt"
       FROM delivery d LEFT JOIN carrier c ON c.id = d.carrier_id WHERE d.order_id = $1`,
      [orderId],
    )
    return row as {
      trackingNumber: string | null
      carrierName: string | null
      dispatchedAt: Date | null
      estimatedDeliveryAt: Date | null
    }
  }

  const list = (who: Seller, query: Record<string, unknown> = {}) =>
    http().get(`${base}/orders`).query(query).set(auth(who.token))
  const detail = (who: Seller, orderNumber: string) =>
    http().get(`${base}/orders/${orderNumber}`).set(auth(who.token))
  const dispatch = (
    who: Seller,
    orderNumber: string,
    body: Record<string, unknown> = {},
  ) =>
    http()
      .post(`${base}/orders/${orderNumber}/dispatch`)
      .set(auth(who.token))
      .send(body)
  const cancel = (
    who: Seller,
    orderNumber: string,
    body: Record<string, unknown> = {},
  ) =>
    http()
      .post(`${base}/orders/${orderNumber}/cancel`)
      .set(auth(who.token))
      .send(body)
  const invoice = (who: Seller, orderNumber: string) =>
    http()
      .get(`${base}/orders/${orderNumber}/invoice`)
      .set(auth(who.token))
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => callback(null, Buffer.concat(chunks)))
      })

  let seller: Seller
  let other: Seller

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailService)
      .useValue(mail)
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

    const [buyer] = await dataSource.query(
      `SELECT id, email FROM "user" WHERE email = 'j.shaw@saclinics.com.au'`,
    )
    buyerId = buyer.id
    buyerEmail = buyer.email
    organisationId = (
      await dataSource.query(
        `SELECT id FROM organisation WHERE name = 'SA Clinics Pty Ltd'`,
      )
    )[0].id
    categoryId = (
      await dataSource.query(`SELECT id FROM category WHERE slug = 'supplies'`)
    )[0].id

    seller = await makeSeller('main')
    other = await makeSeller('other')
    await dataSource.query(
      `UPDATE supplier_profile SET default_carrier = 'E2E Default Carrier' WHERE id = $1`,
      [seller.profileId],
    )
    // A carrier that already exists, for the case-insensitive match and the dispatched fixtures.
    await dataSource.query(`INSERT INTO carrier (name) VALUES ($1)`, [
      carrierName('Existing'),
    ])
  })

  beforeEach(() => mail.send.mockClear())

  afterAll(async () => {
    const orders = `SELECT id FROM "order" WHERE order_number = ANY($1)`
    const invoices: { pdfPath: string }[] = await dataSource.query(
      `SELECT pdf_path AS "pdfPath" FROM invoice WHERE order_id IN (${orders})`,
      [createdOrderNumbers],
    )
    await Promise.all(
      invoices.map((row) =>
        fs.rm(resolveInvoicePdfPath(row.pdfPath), { force: true }),
      ),
    )
    await dataSource.query(
      `DELETE FROM invoice WHERE order_id IN (${orders})`,
      [createdOrderNumbers],
    )
    await dataSource.query(
      `DELETE FROM payment WHERE order_id IN (${orders})`,
      [createdOrderNumbers],
    )
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
    await dataSource.query(`DELETE FROM carrier WHERE name LIKE $1`, [
      `E2E Carrier ${run}%`,
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

  describe('access', () => {
    const number = 'ORD-2099-10000'
    const routes: [string, string][] = [
      ['get', '/orders'],
      ['get', `/orders/${number}`],
      ['post', `/orders/${number}/dispatch`],
      ['post', `/orders/${number}/cancel`],
      ['get', `/orders/${number}/invoice`],
    ]

    it.each(routes)('refuses %s %s with no token', async (method, path) => {
      const response = await http()[method as 'get'](`${base}${path}`)

      expect(response.status).toBe(401)
    })

    // One pending seller for every route: registering hashes a password, which is slow.
    let pending: Seller
    beforeAll(async () => {
      pending = await makeSeller('pending', 'pending')
    })

    it.each(routes)(
      'refuses %s %s to a seller who is not approved',
      async (method, path) => {
        const response = await http()
          [method as 'get'](`${base}${path}`)
          .set(auth(pending.token))

        expect(response.status).toBe(403)
        expect(response.body.message).toBe(
          'Your supplier application has not been approved yet',
        )
      },
    )
  })

  describe('GET /orders (the table)', () => {
    let lister: Seller
    let numbers: Record<string, string>

    beforeAll(async () => {
      lister = await makeSeller('list')
      // Oldest first in the list below; the table shows newest first.
      const placed = await addOrder(lister, 'placed', {
        hoursAgo: 60,
        lines: [2, 3],
        total: '50.00',
      })
      const confirmed = await addOrder(lister, 'confirmed', {
        hoursAgo: 50,
        lines: [1],
        total: '10.00',
      })
      const picking = await addOrder(lister, 'picking', {
        hoursAgo: 40,
        total: '30.00',
      })
      const dispatched = await addOrder(lister, 'dispatched', {
        hoursAgo: 30,
        total: '20.00',
        carrier: carrierName('Existing'),
        trackingNumber: 'T-1',
        dispatchedAt: new Date().toISOString(),
      })
      const delivered = await addOrder(lister, 'delivered', {
        hoursAgo: 20,
        total: '40.00',
        withOrganisation: false,
      })
      const cancelled = await addOrder(lister, 'cancelled', {
        hoursAgo: 10,
        total: '5.00',
      })
      await addOrder(other, 'placed', { total: '99.00' })
      numbers = {
        placed: placed.orderNumber,
        confirmed: confirmed.orderNumber,
        picking: picking.orderNumber,
        dispatched: dispatched.orderNumber,
        delivered: delivered.orderNumber,
        cancelled: cancelled.orderNumber,
      }
    })

    const numbersOf = (response: request.Response): string[] =>
      response.body.data.map((o: { orderNumber: string }) => o.orderNumber)

    it("lists only this seller's orders, newest first, with the row the table shows", async () => {
      const response = await list(lister)

      expect(response.status).toBe(200)
      expect(numbersOf(response)).toEqual([
        numbers.cancelled,
        numbers.delivered,
        numbers.dispatched,
        numbers.picking,
        numbers.confirmed,
        numbers.placed,
      ])
      expect(response.body.data.at(-1)).toEqual({
        orderNumber: numbers.placed,
        organisationName: 'SA Clinics Pty Ltd',
        placedAt: expect.any(String),
        itemCount: 5,
        total: '50.00',
        status: 'new',
        canDownloadInvoice: false,
      })
      expect(response.body.pagingMeta).toMatchObject({
        page: 1,
        totalItem: 6,
        totalPage: 1,
      })
    })

    it("never shows another seller's orders, and a seller with none gets an empty page", async () => {
      const empty = await makeSeller('list-empty')

      const response = await list(empty)

      expect(response.status).toBe(200)
      expect(response.body.data).toEqual([])
      expect(response.body.pagingMeta.totalItem).toBe(0)
    })

    it('counts units, not lines, and shows no organisation as null', async () => {
      const response = await list(lister)

      const byNumber = Object.fromEntries(
        response.body.data.map((o: { orderNumber: string }) => [
          o.orderNumber,
          o,
        ]),
      )
      expect(byNumber[numbers.placed].itemCount).toBe(5)
      expect(byNumber[numbers.confirmed].itemCount).toBe(1)
      expect(byNumber[numbers.delivered].organisationName).toBeNull()
    })

    it("puts the seller's five statuses over the one backend status: placed and confirmed are both new", async () => {
      const response = await list(lister)

      const statusOf = (n: string) =>
        response.body.data.find(
          (o: { orderNumber: string }) => o.orderNumber === n,
        ).status
      expect([
        statusOf(numbers.placed),
        statusOf(numbers.confirmed),
        statusOf(numbers.picking),
        statusOf(numbers.dispatched),
        statusOf(numbers.delivered),
        statusOf(numbers.cancelled),
      ]).toEqual([
        'new',
        'new',
        'picking',
        'dispatched',
        'delivered',
        'cancelled',
      ])
    })

    it('offers the invoice only once an order is dispatched or delivered', async () => {
      const response = await list(lister)

      const canDownload = Object.fromEntries(
        response.body.data.map(
          (o: { status: string; canDownloadInvoice: boolean }) => [
            o.status,
            o.canDownloadInvoice,
          ],
        ),
      )
      expect(canDownload).toEqual({
        new: false,
        picking: false,
        dispatched: true,
        delivered: true,
        cancelled: false,
      })
    })

    it.each([
      ['new', ['placed', 'confirmed']],
      ['picking', ['picking']],
      ['dispatched', ['dispatched']],
      ['delivered', ['delivered']],
      ['cancelled', ['cancelled']],
    ])('filters by status %s', async (status, keys) => {
      const response = await list(lister, { status })

      expect(numbersOf(response).sort()).toEqual(
        keys.map((k) => numbers[k]).sort(),
      )
    })

    it('searches the order number by part of it, ignoring case', async () => {
      const tail = numbers.picking.slice(-4)

      const response = await list(lister, { search: tail })
      const lower = await list(lister, {
        search: numbers.picking.toLowerCase(),
      })

      expect(numbersOf(response)).toContain(numbers.picking)
      expect(numbersOf(lower)).toEqual([numbers.picking])
    })

    it('treats % and _ in a search as literals, not wildcards', async () => {
      expect(numbersOf(await list(lister, { search: '%' }))).toEqual([])
      expect(numbersOf(await list(lister, { search: '_' }))).toEqual([])
    })

    it('combines a status filter with a search', async () => {
      const response = await list(lister, {
        status: 'new',
        search: numbers.confirmed,
      })

      expect(numbersOf(response)).toEqual([numbers.confirmed])
      expect(
        numbersOf(
          await list(lister, { status: 'picking', search: numbers.confirmed }),
        ),
      ).toEqual([])
    })

    it('sorts by total and by when it was placed, either way', async () => {
      const cheapest = await list(lister, {
        orderField: 'total',
        order: 'ASC',
        limit: 2,
      })
      const dearest = await list(lister, {
        orderField: 'total',
        order: 'DESC',
        limit: 2,
      })
      const oldest = await list(lister, {
        orderField: 'placed_at',
        order: 'ASC',
        limit: 1,
      })

      expect(numbersOf(cheapest)).toEqual([
        numbers.cancelled,
        numbers.confirmed,
      ])
      expect(numbersOf(dearest)).toEqual([numbers.placed, numbers.delivered])
      expect(numbersOf(oldest)).toEqual([numbers.placed])
    })

    it('pages, and a page past the end is empty with the right totals', async () => {
      const second = await list(lister, { limit: 2, page: 2 })
      const past = await list(lister, { limit: 2, page: 99 })

      expect(numbersOf(second)).toEqual([numbers.dispatched, numbers.picking])
      expect(second.body.pagingMeta).toMatchObject({
        page: 2,
        limit: 2,
        totalItem: 6,
        totalPage: 3,
        hasPreviousPage: true,
        hasNextPage: true,
      })
      expect(past.body.data).toEqual([])
      expect(past.body.pagingMeta.totalItem).toBe(6)
    })

    it.each([
      ["a status outside the seller's five", { status: 'placed' }],
      [
        'a sort field outside the allow-list',
        { orderField: 'id; DROP TABLE "order"' },
      ],
      ['a sort direction that is not ASC or DESC', { order: 'sideways' }],
    ])('refuses %s', async (_label, query) => {
      const response = await list(lister, query)

      expect(response.status).toBe(400)
    })
  })

  describe('GET /orders/:orderNumber (the detail)', () => {
    it('returns the pick list, address and dispatch details for a new order', async () => {
      const order = await addOrder(seller, 'placed', { lines: [2, 3] })

      const response = await detail(seller, order.orderNumber)

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        orderNumber: order.orderNumber,
        placedAt: expect.any(String),
        status: 'new',
        cancellationReason: null,
        organisationName: 'SA Clinics Pty Ltd',
        items: [
          {
            productName: expect.stringContaining('E2E Item'),
            sku: expect.stringContaining('E2E-ORD-'),
            quantity: 2,
          },
          {
            productName: expect.stringContaining('E2E Item'),
            sku: expect.stringContaining('E2E-ORD-'),
            quantity: 3,
          },
        ],
        delivery: {
          attentionName: 'Pat Buyer',
          streetAddress: '1 Test St',
          suburb: 'Parramatta',
          state: 'NSW',
          postcode: '2150',
          country: expect.any(String),
          notes: 'Leave at dock',
        },
        dispatch: {
          carrierName: null,
          trackingNumber: null,
          dispatchedAt: null,
          estimatedDeliveryAt: null,
          deliveredAt: null,
          defaultCarrier: 'E2E Default Carrier',
        },
        canDispatch: true,
        canDownloadInvoice: false,
      })
    })

    it('lists the pick list by product name, not by row id', async () => {
      const order = await addOrder(seller, 'placed', { lines: [2, 3] })
      // Ids that sort Zulu before Alpha, so ordering by id would give the wrong answer every time.
      const prefix = `00000000-0000-4000-8000-${String(run)
        .padStart(11, '0')
        .slice(-11)}`
      await dataSource.query(
        `UPDATE order_item
         SET id = CASE quantity WHEN 2 THEN $2::uuid ELSE $3::uuid END,
             product_name = CASE quantity WHEN 2 THEN 'Zulu item' ELSE 'Alpha item' END
         WHERE order_id = $1`,
        [order.orderId, `${prefix}1`, `${prefix}2`],
      )

      const response = await detail(seller, order.orderNumber)

      expect(
        response.body.items.map((i: { productName: string }) => i.productName),
      ).toEqual(['Alpha item', 'Zulu item'])
    })

    it('hides a carrier and tracking number that are on file until the order has gone out', async () => {
      const order = await addOrder(seller, 'picking', {
        carrier: carrierName('Existing'),
        trackingNumber: 'EARLY-1',
      })

      const response = await detail(seller, order.orderNumber)

      expect(response.body.dispatch.carrierName).toBeNull()
      expect(response.body.dispatch.trackingNumber).toBeNull()
      expect(response.body.canDispatch).toBe(true)
    })

    it('shows carrier, tracking and times for a dispatched order, which can no longer be dispatched', async () => {
      const at = '2026-10-01T02:00:00.000Z'
      const order = await addOrder(seller, 'dispatched', {
        carrier: carrierName('Existing'),
        trackingNumber: 'T-123',
        dispatchedAt: at,
        estimatedDeliveryAt: '2026-10-04T02:00:00.000Z',
      })

      const response = await detail(seller, order.orderNumber)

      expect(response.body.status).toBe('dispatched')
      expect(response.body.dispatch).toMatchObject({
        carrierName: carrierName('Existing'),
        trackingNumber: 'T-123',
        dispatchedAt: at,
        estimatedDeliveryAt: '2026-10-04T02:00:00.000Z',
      })
      expect(response.body.canDispatch).toBe(false)
      expect(response.body.canDownloadInvoice).toBe(true)
    })

    it('shows delivered orders with their delivery time', async () => {
      const order = await addOrder(seller, 'delivered', {
        carrier: carrierName('Existing'),
        trackingNumber: 'T-9',
        dispatchedAt: '2026-10-01T02:00:00.000Z',
        deliveredAt: '2026-10-03T05:00:00.000Z',
      })

      const response = await detail(seller, order.orderNumber)

      expect(response.body.status).toBe('delivered')
      expect(response.body.dispatch.deliveredAt).toBe(
        '2026-10-03T05:00:00.000Z',
      )
      expect(response.body.canDownloadInvoice).toBe(true)
    })

    it('shows why a cancelled order was cancelled, and offers neither action', async () => {
      const order = await addOrder(seller, 'cancelled')
      await dataSource.query(
        `UPDATE "order" SET cancellation_reason = 'Out of stock' WHERE id = $1`,
        [order.orderId],
      )

      const response = await detail(seller, order.orderNumber)

      expect(response.body.status).toBe('cancelled')
      expect(response.body.cancellationReason).toBe('Out of stock')
      expect(response.body.canDispatch).toBe(false)
      expect(response.body.canDownloadInvoice).toBe(false)
    })

    it("is a 404 for another seller's order, identical to a missing one (ADR 0025)", async () => {
      const theirs = await addOrder(other, 'placed')

      const response = await detail(seller, theirs.orderNumber)
      const missing = await detail(seller, 'ORD-2099-99999')

      expect(response.status).toBe(404)
      expect(response.body).toEqual(missing.body)
      expect(response.body.message).toBe('Order not found')
    })

    it('rejects an order number that is not in the generated shape, before any query', async () => {
      expect((await detail(seller, 'ORD-1')).status).toBe(400)
      expect((await detail(seller, 'not-an-order')).status).toBe(400)
    })
  })

  describe('POST /orders/:orderNumber/dispatch', () => {
    it.each([['placed'], ['confirmed'], ['picking']] as const)(
      'dispatches a %s order: status, carrier, tracking, and server-set times',
      async (status) => {
        const order = await addOrder(seller, status)
        const before = Date.now()

        const response = await dispatch(seller, order.orderNumber, {
          carrierName: carrierName('Existing'),
          trackingNumber: 'TRACK-1',
        })

        const after = Date.now()
        expect(response.status).toBe(200)
        expect(response.body.status).toBe('dispatched')
        expect(response.body.dispatch.carrierName).toBe(carrierName('Existing'))
        expect(response.body.dispatch.trackingNumber).toBe('TRACK-1')
        expect(response.body.canDispatch).toBe(false)
        expect(response.body.canDownloadInvoice).toBe(true)
        const dispatchedAt = new Date(
          response.body.dispatch.dispatchedAt,
        ).getTime()
        const estimated = new Date(
          response.body.dispatch.estimatedDeliveryAt,
        ).getTime()
        expect(dispatchedAt).toBeGreaterThanOrEqual(before - 1000)
        expect(dispatchedAt).toBeLessThanOrEqual(after + 1000)
        expect(estimated - dispatchedAt).toBe(
          TRANSIT_DAYS * 24 * 60 * 60 * 1000,
        )
        expect((await orderRow(order.orderId)).status).toBe('dispatched')
      },
    )

    it('leaves stock and payment alone: dispatching does not touch either', async () => {
      const order = await addOrder(seller, 'placed')

      await dispatch(seller, order.orderNumber, {
        carrierName: carrierName('Existing'),
        trackingNumber: 'T',
      })

      expect(await stockOf(order.products[0].id)).toBe(100)
      expect(await paymentStatus(order.orderId)).toBe('paid')
    })

    it('creates a carrier it has not seen, collapsing stray spaces', async () => {
      const order = await addOrder(seller, 'placed')

      const response = await dispatch(seller, order.orderNumber, {
        carrierName: `  E2E   Carrier ${run}   Brand  New `,
        trackingNumber: '  T-7  ',
      })

      expect(response.status).toBe(200)
      expect(response.body.dispatch.carrierName).toBe(carrierName('Brand New'))
      expect(response.body.dispatch.trackingNumber).toBe('T-7')
    })

    it('reuses an existing carrier whatever the case, without adding a duplicate', async () => {
      const order = await addOrder(seller, 'placed')

      await dispatch(seller, order.orderNumber, {
        carrierName: carrierName('Existing').toUpperCase(),
        trackingNumber: 'T',
      })

      const [{ count }] = await dataSource.query(
        `SELECT count(*)::int AS count FROM carrier WHERE LOWER(name) = LOWER($1)`,
        [carrierName('Existing')],
      )
      expect(count).toBe(1)
      expect((await deliveryRow(order.orderId)).carrierName).toBe(
        carrierName('Existing'),
      )
    })

    it.each(['dispatched', 'delivered', 'cancelled'] as const)(
      'refuses a %s order with 409, changing nothing',
      async (status) => {
        const order = await addOrder(seller, status, {
          carrier: carrierName('Existing'),
          trackingNumber: 'ORIGINAL',
          dispatchedAt: '2026-10-01T02:00:00.000Z',
        })

        const response = await dispatch(seller, order.orderNumber, {
          carrierName: carrierName('Existing'),
          trackingNumber: 'CHANGED',
        })

        expect(response.status).toBe(409)
        expect(response.body.message).toBe('Cannot fulfil this order')
        expect((await deliveryRow(order.orderId)).trackingNumber).toBe(
          'ORIGINAL',
        )
        expect((await orderRow(order.orderId)).status).toBe(status)
      },
    )

    it('refuses to dispatch the same order twice', async () => {
      const order = await addOrder(seller, 'placed')
      const body = {
        carrierName: carrierName('Existing'),
        trackingNumber: 'FIRST',
      }

      const first = await dispatch(seller, order.orderNumber, body)
      const second = await dispatch(seller, order.orderNumber, {
        ...body,
        trackingNumber: 'SECOND',
      })

      expect(first.status).toBe(200)
      expect(second.status).toBe(409)
      expect((await deliveryRow(order.orderId)).trackingNumber).toBe('FIRST')
    })

    it.each([
      ['no carrier', { trackingNumber: 'T' }],
      ['no tracking number', { carrierName: 'X' }],
      ['a blank carrier', { carrierName: '   ', trackingNumber: 'T' }],
      ['a blank tracking number', { carrierName: 'X', trackingNumber: '' }],
      [
        'a carrier over 120 characters',
        { carrierName: 'x'.repeat(121), trackingNumber: 'T' },
      ],
      [
        'a tracking number over 100 characters',
        { carrierName: 'X', trackingNumber: 'x'.repeat(101) },
      ],
      [
        'a dispatch time from the caller',
        {
          carrierName: 'X',
          trackingNumber: 'T',
          dispatchedAt: '2020-01-01T00:00:00Z',
        },
      ],
      [
        'an estimate from the caller',
        {
          carrierName: 'X',
          trackingNumber: 'T',
          estimatedDeliveryAt: '2020-01-01T00:00:00Z',
        },
      ],
    ])('refuses %s', async (_label, body) => {
      const order = await addOrder(seller, 'placed')

      const response = await dispatch(seller, order.orderNumber, body)

      expect(response.status).toBe(400)
      expect((await orderRow(order.orderId)).status).toBe('placed')
    })

    it("is a 404 for another seller's order and changes nothing", async () => {
      const theirs = await addOrder(other, 'placed')

      const response = await dispatch(seller, theirs.orderNumber, {
        carrierName: carrierName('Existing'),
        trackingNumber: 'T',
      })

      expect(response.status).toBe(404)
      expect((await orderRow(theirs.orderId)).status).toBe('placed')
      expect((await deliveryRow(theirs.orderId)).trackingNumber).toBeNull()
    })

    it('lets exactly one of several simultaneous dispatches win, and creates the carrier once', async () => {
      const order = await addOrder(seller, 'placed')
      const name = carrierName('Race')

      const results = await Promise.all(
        [1, 2, 3, 4].map((n) =>
          dispatch(seller, order.orderNumber, {
            carrierName: name,
            trackingNumber: `R-${n}`,
          }),
        ),
      )

      expect(results.map((r) => r.status).sort()).toEqual([200, 409, 409, 409])
      const [{ count }] = await dataSource.query(
        `SELECT count(*)::int AS count FROM carrier WHERE name = $1`,
        [name],
      )
      expect(count).toBe(1)
      expect((await deliveryRow(order.orderId)).trackingNumber).toMatch(
        /^R-[1-4]$/,
      )
    })
  })

  describe('POST /orders/:orderNumber/cancel', () => {
    it.each([['placed'], ['confirmed'], ['picking']] as const)(
      'cancels a %s order: status and reason, stock back, payment refunded, buyer told',
      async (status) => {
        const order = await addOrder(seller, status, { lines: [2, 3] })

        const response = await cancel(seller, order.orderNumber, {
          reason: 'out_of_stock',
        })

        expect(response.status).toBe(200)
        expect(response.body.status).toBe('cancelled')
        expect(response.body.cancellationReason).toBe('Out of stock')
        expect(response.body.canDispatch).toBe(false)
        expect(await orderRow(order.orderId)).toEqual({
          status: 'cancelled',
          cancellationReason: 'Out of stock',
        })
        expect(await stockOf(order.products[0].id)).toBe(102)
        expect(await stockOf(order.products[1].id)).toBe(103)
        expect(await paymentStatus(order.orderId)).toBe('refunded')
        expect(mail.send).toHaveBeenCalledTimes(1)
        expect(mail.send).toHaveBeenCalledWith({
          to: buyerEmail,
          subject: `Order ${order.orderNumber} was cancelled`,
          text: expect.stringContaining('Reason: Out of stock'),
        })
      },
    )

    it('names the seller and promises the refund in the email', async () => {
      const order = await addOrder(seller, 'placed')

      await cancel(seller, order.orderNumber, { reason: 'pricing_error' })

      const { text } = mail.send.mock.calls[0][0]
      expect(text).toContain(`E2E Ord main ${run}`)
      expect(text).toContain(order.orderNumber)
      expect(text).toContain('refunded in full')
    })

    it.each([
      ['out_of_stock', undefined, 'Out of stock'],
      ['cannot_meet_sla', undefined, 'Cannot meet dispatch SLA'],
      ['pricing_error', '  Listed at $1  ', 'Pricing error: Listed at $1'],
      ['other', 'Supplier recall', 'Other: Supplier recall'],
    ])(
      'stores the reason %s with notes %p as "%s"',
      async (reason, notes, expected) => {
        const order = await addOrder(seller, 'placed')

        const response = await cancel(
          seller,
          order.orderNumber,
          notes === undefined ? { reason } : { reason, notes },
        )

        expect(response.status).toBe(200)
        expect(response.body.cancellationReason).toBe(expected)
      },
    )

    it.each([
      ['no reason', {}],
      ['a reason outside the list', { reason: 'changed_my_mind' }],
      ['"other" without notes', { reason: 'other' }],
      ['"other" with blank notes', { reason: 'other', notes: '   ' }],
      ['blank notes', { reason: 'out_of_stock', notes: '' }],
      [
        'notes over 500 characters',
        { reason: 'other', notes: 'x'.repeat(501) },
      ],
    ])('refuses %s, and changes nothing', async (_label, body) => {
      const order = await addOrder(seller, 'placed')

      const response = await cancel(seller, order.orderNumber, body)

      expect(response.status).toBe(400)
      expect((await orderRow(order.orderId)).status).toBe('placed')
      expect(await stockOf(order.products[0].id)).toBe(100)
      expect(mail.send).not.toHaveBeenCalled()
    })

    it.each([
      ['pending', 'pending'],
      ['failed', 'failed'],
    ] as const)(
      'leaves a %s payment alone: nothing was charged',
      async (_label, payment) => {
        const order = await addOrder(seller, 'placed', { payment })

        const response = await cancel(seller, order.orderNumber, {
          reason: 'out_of_stock',
        })

        expect(response.status).toBe(200)
        expect(await paymentStatus(order.orderId)).toBe(payment)
      },
    )

    it('cancels an order that has no payment row', async () => {
      const order = await addOrder(seller, 'placed', { payment: null })

      const response = await cancel(seller, order.orderNumber, {
        reason: 'out_of_stock',
      })

      expect(response.status).toBe(200)
      expect(await paymentStatus(order.orderId)).toBeUndefined()
    })

    it.each(['dispatched', 'delivered', 'cancelled'] as const)(
      'refuses a %s order with 409: stock, payment and the buyer are untouched',
      async (status) => {
        const order = await addOrder(seller, status)

        const response = await cancel(seller, order.orderNumber, {
          reason: 'out_of_stock',
        })

        expect(response.status).toBe(409)
        expect(response.body.message).toBe(
          'This order can no longer be cancelled',
        )
        expect(await stockOf(order.products[0].id)).toBe(100)
        expect(await paymentStatus(order.orderId)).toBe('paid')
        expect((await orderRow(order.orderId)).status).toBe(status)
        expect(mail.send).not.toHaveBeenCalled()
      },
    )

    it('gives the stock back once, however many times cancel is called', async () => {
      const order = await addOrder(seller, 'placed')

      const first = await cancel(seller, order.orderNumber, {
        reason: 'out_of_stock',
      })
      const second = await cancel(seller, order.orderNumber, {
        reason: 'out_of_stock',
      })

      expect(first.status).toBe(200)
      expect(second.status).toBe(409)
      expect(await stockOf(order.products[0].id)).toBe(102)
      expect(mail.send).toHaveBeenCalledTimes(1)
    })

    it("is a 404 for another seller's order and changes nothing", async () => {
      const theirs = await addOrder(other, 'placed')

      const response = await cancel(seller, theirs.orderNumber, {
        reason: 'out_of_stock',
      })

      expect(response.status).toBe(404)
      expect((await orderRow(theirs.orderId)).status).toBe('placed')
      expect(await stockOf(theirs.products[0].id)).toBe(100)
      expect(await paymentStatus(theirs.orderId)).toBe('paid')
      expect(mail.send).not.toHaveBeenCalled()
    })

    it('lets exactly one of several simultaneous cancels win, returning the stock once', async () => {
      const order = await addOrder(seller, 'placed')

      const results = await Promise.all(
        [1, 2, 3, 4].map(() =>
          cancel(seller, order.orderNumber, { reason: 'out_of_stock' }),
        ),
      )

      expect(results.map((r) => r.status).sort()).toEqual([200, 409, 409, 409])
      expect(await stockOf(order.products[0].id)).toBe(102)
      expect(mail.send).toHaveBeenCalledTimes(1)
    })

    it('never both dispatches and cancels one order when the two race', async () => {
      for (let round = 0; round < 8; round++) {
        mail.send.mockClear()
        const order = await addOrder(seller, 'placed')

        const [dispatched, cancelled] = await Promise.all([
          dispatch(seller, order.orderNumber, {
            carrierName: carrierName('Existing'),
            trackingNumber: `X-${round}`,
          }),
          cancel(seller, order.orderNumber, { reason: 'out_of_stock' }),
        ])

        expect([dispatched.status, cancelled.status].sort()).toEqual([200, 409])
        const row = await orderRow(order.orderId)
        if (dispatched.status === 200) {
          expect(row.status).toBe('dispatched')
          expect(await stockOf(order.products[0].id)).toBe(100)
          expect(await paymentStatus(order.orderId)).toBe('paid')
          expect(mail.send).not.toHaveBeenCalled()
        } else {
          expect(row.status).toBe('cancelled')
          expect(await stockOf(order.products[0].id)).toBe(102)
          expect(await paymentStatus(order.orderId)).toBe('refunded')
          expect((await deliveryRow(order.orderId)).trackingNumber).toBeNull()
          expect(mail.send).toHaveBeenCalledTimes(1)
        }
      }
    })
  })

  // Generating the first PDF starts Chromium, which can take a few seconds.
  describe('GET /orders/:orderNumber/invoice', () => {
    jest.setTimeout(30000)

    it('downloads a PDF for a dispatched order, named after the order, and stores one invoice row', async () => {
      const order = await addOrder(seller, 'dispatched', {
        carrier: carrierName('Existing'),
        trackingNumber: 'T',
        dispatchedAt: new Date().toISOString(),
        total: '110.00',
      })

      const response = await invoice(seller, order.orderNumber)

      expect(response.status).toBe(200)
      expect(response.headers['content-type']).toBe('application/pdf')
      expect(response.headers['content-disposition']).toBe(
        `attachment; filename="${order.orderNumber}-invoice.pdf"`,
      )
      expect(Buffer.isBuffer(response.body)).toBe(true)
      expect(response.body.subarray(0, 5).toString()).toBe('%PDF-')
      const rows = await dataSource.query(
        `SELECT invoice_number AS "invoiceNumber", seller_business_name AS "sellerBusinessName",
                seller_abn AS "sellerAbn", buyer_organisation_name AS "buyerName",
                total::text AS total, pdf_path AS "pdfPath"
         FROM invoice WHERE order_id = $1`,
        [order.orderId],
      )
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({
        sellerBusinessName: `E2E Ord main ${run}`,
        sellerAbn: '51824753556',
        buyerName: 'SA Clinics Pty Ltd',
        total: '110.00',
      })
      expect(rows[0].invoiceNumber).toMatch(/^INV-\d{4}-\d{5}$/)
      await expect(
        fs.access(resolveInvoicePdfPath(rows[0].pdfPath)),
      ).resolves.toBeUndefined()
    })

    it('serves the same stored file on a repeat download, with no second invoice row', async () => {
      const order = await addOrder(seller, 'delivered', {
        carrier: carrierName('Existing'),
        trackingNumber: 'T',
        dispatchedAt: new Date().toISOString(),
      })

      const first = await invoice(seller, order.orderNumber)
      const second = await invoice(seller, order.orderNumber)

      expect(first.status).toBe(200)
      expect(second.body.equals(first.body)).toBe(true)
      const [{ count }] = await dataSource.query(
        `SELECT count(*)::int AS count FROM invoice WHERE order_id = $1`,
        [order.orderId],
      )
      expect(count).toBe(1)
    })

    it('stays frozen when the seller later renames the business: it is a document, not a view', async () => {
      const renamer = await makeSeller('rename')
      const order = await addOrder(renamer, 'dispatched', {
        carrier: carrierName('Existing'),
        trackingNumber: 'T',
        dispatchedAt: new Date().toISOString(),
      })
      const first = await invoice(renamer, order.orderNumber)

      await dataSource.query(
        `UPDATE supplier_profile SET business_name = 'Renamed Pty Ltd' WHERE id = $1`,
        [renamer.profileId],
      )
      const second = await invoice(renamer, order.orderNumber)

      expect(second.body.equals(first.body)).toBe(true)
      const [row] = await dataSource.query(
        `SELECT seller_business_name AS name FROM invoice WHERE order_id = $1`,
        [order.orderId],
      )
      expect(row.name).toBe(`E2E Ord rename ${run}`)
    })

    it.each(['placed', 'confirmed', 'picking', 'cancelled'] as const)(
      'refuses a %s order with 409 and writes nothing',
      async (status) => {
        const order = await addOrder(seller, status)

        const response = await http()
          .get(`${base}/orders/${order.orderNumber}/invoice`)
          .set(auth(seller.token))

        expect(response.status).toBe(409)
        expect(response.body.message).toBe(
          'The invoice is not available until this order has dispatched',
        )
        const [{ count }] = await dataSource.query(
          `SELECT count(*)::int AS count FROM invoice WHERE order_id = $1`,
          [order.orderId],
        )
        expect(count).toBe(0)
      },
    )

    it('survives two simultaneous first downloads: one invoice, both get a PDF', async () => {
      const order = await addOrder(seller, 'dispatched', {
        carrier: carrierName('Existing'),
        trackingNumber: 'T',
        dispatchedAt: new Date().toISOString(),
      })

      const [a, b] = await Promise.all([
        invoice(seller, order.orderNumber),
        invoice(seller, order.orderNumber),
      ])

      expect([a.status, b.status]).toEqual([200, 200])
      const [{ count }] = await dataSource.query(
        `SELECT count(*)::int AS count FROM invoice WHERE order_id = $1`,
        [order.orderId],
      )
      expect(count).toBe(1)
    })

    it('gets a dispatched order its invoice straight after dispatching it', async () => {
      const order = await addOrder(seller, 'placed')
      await dispatch(seller, order.orderNumber, {
        carrierName: carrierName('Existing'),
        trackingNumber: 'T',
      })

      const response = await invoice(seller, order.orderNumber)

      expect(response.status).toBe(200)
      expect(response.body.subarray(0, 5).toString()).toBe('%PDF-')
    })

    it("is a 404 for another seller's order, and 400 for a malformed number", async () => {
      const theirs = await addOrder(other, 'dispatched', {
        carrier: carrierName('Existing'),
        trackingNumber: 'T',
        dispatchedAt: new Date().toISOString(),
      })

      const foreign = await http()
        .get(`${base}/orders/${theirs.orderNumber}/invoice`)
        .set(auth(seller.token))
      const malformed = await http()
        .get(`${base}/orders/nope/invoice`)
        .set(auth(seller.token))

      expect(foreign.status).toBe(404)
      expect(malformed.status).toBe(400)
      const [{ count }] = await dataSource.query(
        `SELECT count(*)::int AS count FROM invoice WHERE order_id = $1`,
        [theirs.orderId],
      )
      expect(count).toBe(0)
    })
  })
})
