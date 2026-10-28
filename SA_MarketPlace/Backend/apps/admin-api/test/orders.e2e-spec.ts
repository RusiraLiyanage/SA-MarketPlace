// This suite registers an admin per run; the rate limit has its own spec.
process.env.AUTH_THROTTLE_LIMIT = '1000'

import { createHmac } from 'crypto'
import { promises as fs } from 'fs'
import { INestApplication, Logger, VersioningType } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import {
  AllExceptionsFilter,
  resolveInvoicePdfPath,
} from '@sa-marketplace/common'
import * as request from 'supertest'
import { DataSource } from 'typeorm'
import { API_PREFIX } from '../src/app.constant'
import { AppModule } from '../src/app.module'
import { AppValidationPipe } from '../src/app.pipe'

type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'picking'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'
type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

type Supplier = { profileId: string; name: string; productId: string }
type Fixture = { orderNumber: string; orderId: string }

// A minimal RFC 4180 reader, so the export is checked as a spreadsheet would read it.
const parseCsv = (text: string): string[][] => {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"'
        i += 1
      } else if (char === '"') {
        quoted = false
      } else {
        cell += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(cell)
      cell = ''
    } else if (char === '\r' && text[i + 1] === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      i += 1
    } else {
      cell += char
    }
  }
  return rows
}

// Requires the local database: pnpm db:up, pnpm db:seed. Admins, suppliers, customers and orders are
// created per run and removed in afterAll; the seeded orders are never touched (lists are scoped by
// each test's own customer name).
describe('Admin orders (e2e)', () => {
  let app: INestApplication
  let dataSource: DataSource
  let jwtSecret: string

  const base = '/api/admin/v1'
  const password = 'Sup3rSecret!'
  const run = Date.now()
  const buyerFirstName = `E2EBuyer${run}`
  const buyerFullName = `${buyerFirstName} Tester`

  const createdEmails: string[] = []
  const createdOrderNumbers: string[] = []
  let counter = 0
  const organisationIds = new Map<string, string>()

  let admin: { email: string; token: string; id: string }
  let buyerId: string
  let supplierA: Supplier
  let supplierB: Supplier

  const http = () => request(app.getHttpServer())
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` })
  const get = (path: string, token = admin.token) =>
    http().get(`${base}${path}`).set(auth(token))

  // Each test works inside its own customer, so its list holds only its own orders.
  const orgName = (scope: string) => `E2E Ord ${run} ${scope}`
  const listOf = (scope: string, query = '') =>
    get(`/orders?search=${encodeURIComponent(orgName(scope))}${query}`)
  const exportOf = (scope: string, query = '') =>
    get(`/orders/export?search=${encodeURIComponent(orgName(scope))}${query}`)

  const insertOrganisation = async (name: string): Promise<string> => {
    const [{ id }] = await dataSource.query(
      `INSERT INTO organisation (name) VALUES ($1) RETURNING id`,
      [name],
    )
    return id
  }

  const insertUser = async (
    email: string,
    firstName: string,
    lastName: string,
    role: string,
  ): Promise<string> => {
    createdEmails.push(email)
    const [{ id }] = await dataSource.query(
      `INSERT INTO "user" (email, password_hash, password_length, first_name, last_name, phone)
       VALUES ($1, '$2b$10$fixture.hash.not.a.secret.fixture.hash.not.a.secretxx', 12, $2, $3, '0400 000 000')
       RETURNING id`,
      [email, firstName, lastName],
    )
    await dataSource.query(
      `INSERT INTO user_role (user_id, role) VALUES ($1, $2)`,
      [id, role],
    )
    return id
  }

  const makeSupplier = async (label: string): Promise<Supplier> => {
    counter += 1
    const name = `E2E OrdSup ${run} ${label}`
    const userId = await insertUser(
      `e2e.ord.sup.${label}.${counter}.${run}@example.com`.toLowerCase(),
      'Sam',
      'Supplier',
      'seller',
    )
    const [{ id: profileId }] = await dataSource.query(
      `INSERT INTO supplier_profile (user_id, business_name, abn, status, submitted_at,
                                     reviewed_at, approved_at)
       VALUES ($1, $2, '51824753556', 'approved', now(), now(), now()) RETURNING id`,
      [userId, name],
    )
    const [{ id: productId }] = await dataSource.query(
      `INSERT INTO product (supplier_profile_id, category_id, name, sku, price, quantity,
                            low_stock_threshold, listing_status)
       VALUES ($1, (SELECT id FROM category WHERE slug = 'ppe'), 'E2E product', $2, 5.00, 10, 1, 'published')
       RETURNING id`,
      [profileId, `E2E-ORD-${run}-${label}`],
    )
    return { profileId, name, productId }
  }

  type OrderOptions = {
    scope: string
    status?: OrderStatus
    payment?: PaymentStatus | null
    method?: 'card_mock' | 'invoice_on_account'
    placedAt?: string
    total?: string
    supplier?: Supplier
    // The customer name; null makes it an order with no organisation (the buyer's own name shows).
    organisation?: string | null
    // Another buyer, for tests that search by buyer name.
    buyer?: string
    items?: { name: string; sku: string; quantity: number; lineTotal: string }[]
    carrier?: string
    trackingNumber?: string
    dispatchedAt?: string
    deliveredAt?: string
    cancellationReason?: string
  }

  const makeOrder = async (options: OrderOptions): Promise<Fixture> => {
    counter += 1
    const orderNumber = `ORD-2098-${String(
      (run % 80000) + 10000 + counter,
    ).padStart(5, '0')}`
    createdOrderNumbers.push(orderNumber)
    const total = options.total ?? '11.00'
    const supplier = options.supplier ?? supplierA
    let organisation: string | null = null
    if (options.organisation !== null) {
      const name = options.organisation ?? orgName(options.scope)
      const known = organisationIds.get(name)
      organisation = known ?? (await insertOrganisation(name))
      organisationIds.set(name, organisation)
    }

    const [{ id: orderId }] = await dataSource.query(
      `INSERT INTO "order" (order_number, user_id, organisation_id, supplier_profile_id, status,
                            subtotal, gst_total, total, placed_at, cancellation_reason)
       VALUES ($1, $2, $3, $4, $5, $6::numeric - 1, 1.00, $6::numeric, $7, $8) RETURNING id`,
      [
        orderNumber,
        options.buyer ?? buyerId,
        organisation,
        supplier.profileId,
        options.status ?? 'placed',
        total,
        options.placedAt ?? '2026-08-01T00:00:00Z',
        options.cancellationReason ?? null,
      ],
    )

    const items = options.items ?? [
      {
        name: 'E2E Item',
        sku: `E2E-SKU-${counter}`,
        quantity: 2,
        lineTotal: total,
      },
    ]
    for (const item of items) {
      await dataSource.query(
        `INSERT INTO order_item (order_id, product_id, product_name, sku, quantity,
                                 unit_price_at_purchase, line_total)
         VALUES ($1, $2, $3, $4, $5, 1.00, $6)`,
        [
          orderId,
          supplier.productId,
          item.name,
          item.sku,
          item.quantity,
          item.lineTotal,
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
        options.dispatchedAt ? '2026-08-05T00:00:00Z' : null,
        options.deliveredAt ?? null,
      ],
    )

    if (options.payment !== null) {
      await dataSource.query(
        `INSERT INTO payment (order_id, method, status, amount, paid_at)
         VALUES ($1, $2, $3, $4::numeric, now())`,
        [
          orderId,
          options.method ?? 'card_mock',
          options.payment ?? 'paid',
          total,
        ],
      )
    }
    return { orderNumber, orderId }
  }

  const forge = (roles: string[], aud = 'admin') => {
    const encode = (value: object) =>
      Buffer.from(JSON.stringify(value)).toString('base64url')
    const header = encode({ alg: 'HS256', typ: 'JWT' })
    const now = Math.floor(Date.now() / 1000)
    const payload = encode({
      sub: admin.id,
      email: admin.email,
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

    const email = `e2e.ord.admin.${run}@sampleassist.com.au`
    createdEmails.push(email)
    const registered = await http()
      .post(`${base}/auth/register`)
      .send({ fullName: 'Casey Reviewer', email, password, acceptTerms: true })
    expect(registered.status).toBe(201)
    const [{ id }] = await dataSource.query(
      `SELECT id FROM "user" WHERE email = $1`,
      [email],
    )
    admin = { email, token: registered.body.access_token, id }

    buyerId = await insertUser(
      `e2e.ord.buyer.${run}@example.com`,
      buyerFirstName,
      'Tester',
      'buyer',
    )
    supplierA = await makeSupplier('A')
    supplierB = await makeSupplier('B')
  })

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
    for (const table of ['invoice', 'payment', 'delivery', 'order_item']) {
      await dataSource.query(
        `DELETE FROM ${table} WHERE order_id IN (${orders})`,
        [createdOrderNumbers],
      )
    }
    await dataSource.query(`DELETE FROM "order" WHERE order_number = ANY($1)`, [
      createdOrderNumbers,
    ])
    await dataSource.query(`DELETE FROM carrier WHERE name LIKE $1`, [
      `E2E Carrier%${run}`,
    ])
    await dataSource.query(
      `DELETE FROM "order" WHERE order_number LIKE 'ORD-2097-%' AND user_id = $1`,
      [buyerId],
    )
    await dataSource.query(`DELETE FROM organisation WHERE name LIKE $1`, [
      `E2E Ord ${run}%`,
    ])
    await dataSource.query(`DELETE FROM organisation WHERE name LIKE $1`, [
      `%E2E-INJECT-${run}%`,
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
    const number = 'ORD-2026-00001'
    const routes: [string, string][] = [
      ['get', '/orders'],
      ['get', '/orders/export'],
      ['get', `/orders/${number}`],
      ['get', `/orders/${number}/invoice`],
    ]

    it.each(routes)('refuses %s %s with no token', async (method, path) => {
      const response = await http()[method as 'get'](`${base}${path}`)

      expect(response.status).toBe(401)
    })

    it.each(routes)(
      "refuses %s %s for a token that is for this app but not an admin's",
      async (method, path) => {
        const response = await http()
          [method as 'get'](`${base}${path}`)
          .set(auth(forge(['seller'])))

        expect(response.status).toBe(403)
      },
    )

    it.each(routes)(
      'refuses %s %s for a token for another app, even with the admin role',
      async (method, path) => {
        const response = await http()
          [method as 'get'](`${base}${path}`)
          .set(auth(forge(['admin'], 'supplier')))

        expect(response.status).toBe(401)
      },
    )

    it('answers an admin token', async () => {
      expect((await get('/orders?limit=1')).status).toBe(200)
    })
  })

  describe('GET /orders', () => {
    it('shows the table columns for one order', async () => {
      const order = await makeOrder({
        scope: 'shape',
        status: 'dispatched',
        payment: 'paid',
        total: '234.00',
        placedAt: '2026-06-17T01:00:00Z',
      })

      const response = await listOf('shape')

      expect(response.status).toBe(200)
      expect(response.body.data).toEqual([
        {
          orderNumber: order.orderNumber,
          customerName: orgName('shape'),
          supplierName: supplierA.name,
          placedAt: '2026-06-17T01:00:00.000Z',
          total: '234.00',
          payment: { status: 'paid', method: 'card_mock' },
          fulfilment: 'dispatched',
        },
      ])
      expect(JSON.stringify(response.body)).not.toMatch(/\$2b\$|password/i)
    })

    it("shows the buyer's own name when the order has no organisation", async () => {
      const order = await makeOrder({ scope: 'no-org', organisation: null })

      const response = await get(
        `/orders?search=${encodeURIComponent(order.orderNumber)}`,
      )

      expect(response.body.data[0].customerName).toBe(buyerFullName)
    })

    it('shows a null payment for an order with no payment row, still listing it', async () => {
      const order = await makeOrder({ scope: 'no-pay', payment: null })

      const response = await listOf('no-pay')

      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0]).toMatchObject({
        orderNumber: order.orderNumber,
        payment: null,
      })
    })

    it.each([
      ['placed', 'received'],
      ['confirmed', 'received'],
      ['picking', 'picking'],
      ['dispatched', 'dispatched'],
      ['delivered', 'delivered'],
      ['cancelled', 'cancelled'],
    ] as const)('shows a %s order as %s', async (status, fulfilment) => {
      await makeOrder({ scope: `map-${status}`, status })

      const response = await listOf(`map-${status}`)

      expect(response.body.data[0].fulfilment).toBe(fulfilment)
    })

    it('lists orders of every supplier, not one supplier or buyer', async () => {
      await makeOrder({ scope: 'all-sup', supplier: supplierA })
      await makeOrder({ scope: 'all-sup', supplier: supplierB })

      const response = await listOf('all-sup')

      expect(
        response.body.data
          .map((r: { supplierName: string }) => r.supplierName)
          .sort(),
      ).toEqual([supplierA.name, supplierB.name].sort())
    })

    it.each(['pending', 'paid', 'failed', 'refunded'] as const)(
      'filters by payment %s',
      async (payment) => {
        for (const other of [
          'pending',
          'paid',
          'failed',
          'refunded',
        ] as const) {
          await makeOrder({ scope: `pay-${payment}`, payment: other })
        }
        await makeOrder({ scope: `pay-${payment}`, payment: null })

        const response = await listOf(`pay-${payment}`, `&payment=${payment}`)

        expect(response.body.data).toHaveLength(1)
        expect(response.body.data[0].payment.status).toBe(payment)
      },
    )

    it('filters "received" to placed and confirmed, and the others to their own', async () => {
      const statuses: OrderStatus[] = [
        'placed',
        'confirmed',
        'picking',
        'dispatched',
        'delivered',
        'cancelled',
      ]
      for (const status of statuses) {
        await makeOrder({ scope: 'ful', status })
      }

      const stagesFor = async (stage: string) =>
        (await listOf('ful', `&fulfilment=${stage}`)).body.data.map(
          (r: { fulfilment: string }) => r.fulfilment,
        )

      expect(await stagesFor('received')).toEqual(['received', 'received'])
      expect(await stagesFor('picking')).toEqual(['picking'])
      expect(await stagesFor('dispatched')).toEqual(['dispatched'])
      expect(await stagesFor('delivered')).toEqual(['delivered'])
      expect(await stagesFor('cancelled')).toEqual(['cancelled'])
      expect((await listOf('ful')).body.pagingMeta.totalItem).toBe(6)
    })

    it('combines payment, fulfilment and search with AND', async () => {
      await makeOrder({ scope: 'and', status: 'delivered', payment: 'paid' })
      await makeOrder({ scope: 'and', status: 'delivered', payment: 'failed' })
      await makeOrder({ scope: 'and', status: 'picking', payment: 'paid' })

      const response = await listOf('and', '&payment=paid&fulfilment=delivered')

      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0]).toMatchObject({
        fulfilment: 'delivered',
        payment: { status: 'paid' },
      })
    })

    it('sorts newest first by default, and by total and order number in the order asked', async () => {
      const cheapOld = await makeOrder({
        scope: 'sort',
        total: '10.00',
        placedAt: '2026-06-01T00:00:00Z',
      })
      const dearNew = await makeOrder({
        scope: 'sort',
        total: '90.00',
        placedAt: '2026-06-03T00:00:00Z',
      })
      const midMid = await makeOrder({
        scope: 'sort',
        total: '50.00',
        placedAt: '2026-06-02T00:00:00Z',
      })
      const numbers = async (query: string) =>
        (await listOf('sort', query)).body.data.map(
          (r: { orderNumber: string }) => r.orderNumber,
        )

      expect(await numbers('')).toEqual([
        dearNew.orderNumber,
        midMid.orderNumber,
        cheapOld.orderNumber,
      ])
      expect(await numbers('&orderField=placed_at&order=ASC')).toEqual([
        cheapOld.orderNumber,
        midMid.orderNumber,
        dearNew.orderNumber,
      ])
      expect(await numbers('&orderField=total&order=ASC')).toEqual([
        cheapOld.orderNumber,
        midMid.orderNumber,
        dearNew.orderNumber,
      ])
      expect(await numbers('&orderField=total&order=DESC')).toEqual([
        dearNew.orderNumber,
        midMid.orderNumber,
        cheapOld.orderNumber,
      ])
      expect(await numbers('&orderField=order_number&order=ASC')).toEqual(
        [cheapOld, dearNew, midMid].map((o) => o.orderNumber).sort(),
      )
    })

    it('searches the order number, the organisation name and the buyer name, without regard to case', async () => {
      const order = await makeOrder({ scope: 'find' })
      const onlyBuyerName = `E2EOnly${run} Lonely`
      const buyer = await insertUser(
        `e2e.ord.only.${run}@example.com`,
        `E2EOnly${run}`,
        'Lonely',
        'buyer',
      )
      const withOrg = await makeOrder({ scope: 'by-name', buyer })
      const noOrg = await makeOrder({
        scope: 'by-name',
        organisation: null,
        buyer,
      })
      const idsFor = async (term: string) =>
        (await get(`/orders?search=${encodeURIComponent(term)}`)).body.data
          .map((r: { orderNumber: string }) => r.orderNumber)
          .sort()

      expect(await idsFor(order.orderNumber.toLowerCase())).toEqual([
        order.orderNumber,
      ])
      expect(await idsFor(order.orderNumber.slice(-8))).toContain(
        order.orderNumber,
      )
      expect(await idsFor(orgName('find').toUpperCase())).toEqual([
        order.orderNumber,
      ])
      // The buyer's name finds their orders whether or not an organisation is on them.
      expect(await idsFor(onlyBuyerName.toLowerCase())).toEqual(
        [withOrg.orderNumber, noOrg.orderNumber].sort(),
      )
    })

    it('does not search the supplier name', async () => {
      await makeOrder({ scope: 'by-supplier' })

      const response = await get(
        `/orders?search=${encodeURIComponent(supplierA.name)}`,
      )

      expect(response.body.data).toEqual([])
    })

    it.each([['%'], ['_'], ['%%'], ['_ _'], ['\\']])(
      'finds nothing for a search that is only %s, which is plain text',
      async (term) => {
        await makeOrder({ scope: 'wild' })

        const response = await get(`/orders?search=${encodeURIComponent(term)}`)

        expect(response.status).toBe(200)
        expect(response.body.data).toEqual([])
      },
    )

    it('keeps a stable order across pages when orders tie on the sort', async () => {
      for (let i = 0; i < 7; i += 1) {
        await makeOrder({
          scope: 'ties',
          total: '10.00',
          placedAt: '2026-06-01T00:00:00Z',
        })
      }

      const seen: string[] = []
      for (const page of [1, 2, 3, 4]) {
        const response = await listOf('ties', `&page=${page}&limit=2`)
        seen.push(
          ...response.body.data.map(
            (r: { orderNumber: string }) => r.orderNumber,
          ),
        )
      }

      expect(seen).toHaveLength(7)
      expect(new Set(seen).size).toBe(7)
    })

    it('pages the results and reports the totals', async () => {
      for (let i = 1; i <= 5; i += 1) {
        await makeOrder({
          scope: 'page',
          placedAt: `2026-06-0${i}T00:00:00Z`,
        })
      }
      const all = await listOf('page', '&limit=30')

      const second = await listOf('page', '&page=2&limit=2')

      expect(all.body.data).toHaveLength(5)
      expect(second.body.data).toEqual(all.body.data.slice(2, 4))
      expect(second.body.pagingMeta).toMatchObject({
        page: 2,
        limit: 2,
        totalItem: 5,
        totalPage: 3,
        hasPreviousPage: true,
        hasNextPage: true,
      })
      const last = await listOf('page', '&page=3&limit=2')
      expect(last.body.data).toHaveLength(1)
      expect(last.body.pagingMeta.hasNextPage).toBe(false)
    })

    it.each([
      ['an unknown payment status', 'payment=maybe'],
      ['an unknown fulfilment stage', 'fulfilment=new'],
      ['an unknown sort field', 'orderField=password_hash'],
      ['an unknown sort order', 'order=sideways'],
      ['a limit of 0', 'limit=0'],
      ['a limit over 30', 'limit=31'],
      ['a page of 0', 'page=0'],
      ['a search over 100 characters', `search=${'a'.repeat(101)}`],
    ])('rejects %s', async (_label, query) => {
      expect((await get(`/orders?${query}`)).status).toBe(400)
    })
  })

  describe('GET /orders/:orderNumber', () => {
    it('shows a dispatched order in full', async () => {
      await dataSource.query(`INSERT INTO carrier (name) VALUES ($1)`, [
        `E2E Carrier ${run}`,
      ])
      const order = await makeOrder({
        scope: 'detail',
        status: 'dispatched',
        total: '890.00',
        placedAt: '2026-06-17T01:00:00Z',
        carrier: `E2E Carrier ${run}`,
        trackingNumber: 'AU123',
        dispatchedAt: '2026-06-18T02:00:00Z',
        items: [
          { name: 'Zeta Kit', sku: 'ZK-1', quantity: 3, lineTotal: '30.00' },
          { name: 'Alpha Kit', sku: 'AK-1', quantity: 10, lineTotal: '249.90' },
        ],
      })

      const response = await get(`/orders/${order.orderNumber}`)

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        orderNumber: order.orderNumber,
        placedAt: '2026-06-17T01:00:00.000Z',
        customerName: orgName('detail'),
        supplierName: supplierA.name,
        payment: { status: 'paid', method: 'card_mock' },
        fulfilment: 'dispatched',
        cancellationReason: null,
        items: [
          {
            productName: 'Alpha Kit',
            sku: 'AK-1',
            quantity: 10,
            lineTotal: '249.90',
          },
          {
            productName: 'Zeta Kit',
            sku: 'ZK-1',
            quantity: 3,
            lineTotal: '30.00',
          },
        ],
        subtotal: '889.00',
        gstTotal: '1.00',
        total: '890.00',
        delivery: {
          attentionName: 'Pat Buyer',
          streetAddress: '1 Test St',
          suburb: 'Parramatta',
          state: 'NSW',
          postcode: '2150',
          country: 'Australia',
          notes: 'Leave at dock',
        },
        dispatch: {
          carrierName: `E2E Carrier ${run}`,
          trackingNumber: 'AU123',
          dispatchedAt: '2026-06-18T02:00:00.000Z',
          estimatedDeliveryAt: '2026-08-05T00:00:00.000Z',
          deliveredAt: null,
        },
        canDownloadInvoice: true,
      })
      expect(JSON.stringify(response.body)).not.toMatch(/\$2b\$|password/i)
    })

    it('orders items by name, then by id for equal names', async () => {
      const order = await makeOrder({
        scope: 'detail-items',
        items: [
          ...[6, 2, 5, 1, 4, 3].map((n) => ({
            name: 'Same',
            sku: `S-${n}`,
            quantity: 1,
            lineTotal: '1.00',
          })),
          { name: 'Aardvark', sku: 'A-1', quantity: 1, lineTotal: '1.00' },
        ],
      })

      const first = await get(`/orders/${order.orderNumber}`)
      const second = await get(`/orders/${order.orderNumber}`)

      // Equal names are told apart by id (a random UUID, so not insertion order), and the same
      // way every time, so the screen never reshuffles.
      const [tiedByIdAscending] = await dataSource.query(
        `SELECT array_agg(sku ORDER BY id) AS skus FROM order_item
         WHERE order_id = $1 AND product_name = 'Same'`,
        [order.orderId],
      )
      expect(first.body.items.map((i: { sku: string }) => i.sku)).toEqual([
        'A-1',
        ...tiedByIdAscending.skus,
      ])
      expect(second.body.items).toEqual(first.body.items)
    })

    it('hides a carrier that was assigned before dispatch, and says an invoice is not ready', async () => {
      await dataSource.query(`INSERT INTO carrier (name) VALUES ($1)`, [
        `E2E Carrier Pre ${run}`,
      ])
      const order = await makeOrder({
        scope: 'detail-pre',
        status: 'picking',
        carrier: `E2E Carrier Pre ${run}`,
        trackingNumber: 'PRE123',
      })

      const response = await get(`/orders/${order.orderNumber}`)

      expect(response.body.dispatch).toMatchObject({
        carrierName: null,
        trackingNumber: null,
      })
      expect(response.body.canDownloadInvoice).toBe(false)
    })

    it('shows the cancellation reason of a cancelled order', async () => {
      const order = await makeOrder({
        scope: 'detail-cancel',
        status: 'cancelled',
        payment: 'refunded',
        cancellationReason: 'Out of stock',
      })

      const response = await get(`/orders/${order.orderNumber}`)

      expect(response.body).toMatchObject({
        fulfilment: 'cancelled',
        cancellationReason: 'Out of stock',
        payment: { status: 'refunded' },
        canDownloadInvoice: false,
      })
    })

    it.each([
      ['placed', false],
      ['confirmed', false],
      ['picking', false],
      ['dispatched', true],
      ['delivered', true],
      ['cancelled', false],
    ] as const)(
      'says canDownloadInvoice for a %s order is %s',
      async (status, expected) => {
        const order = await makeOrder({ scope: `detail-inv-${status}`, status })

        const response = await get(`/orders/${order.orderNumber}`)

        expect(response.body.canDownloadInvoice).toBe(expected)
      },
    )

    it('shows the buyer name for an order with no organisation, and a null payment', async () => {
      const order = await makeOrder({
        scope: 'detail-bare',
        organisation: null,
        payment: null,
      })

      const response = await get(`/orders/${order.orderNumber}`)

      expect(response.body).toMatchObject({
        customerName: buyerFullName,
        payment: null,
      })
    })

    it('answers 404 for an order that does not exist', async () => {
      const missing = await get('/orders/ORD-2098-99999')

      expect(missing.status).toBe(404)
      expect(missing.body.error).toBe('ECB404')
    })

    it.each([
      ['not-an-order'],
      ['ORD-2026-1'],
      ['ORD-26-00001'],
      ['ord-2026-00001'],
      ['ORD-2026-000012'],
      ['ORD-2026-00001x'],
      ['xORD-2026-00001'],
      ['ORD-2026-0000a'],
    ])('answers 400 for the malformed number %s', async (number) => {
      expect((await get(`/orders/${number}`)).status).toBe(400)
      expect((await get(`/orders/${number}/invoice`)).status).toBe(400)
    })
  })

  describe('GET /orders/:orderNumber/invoice', () => {
    it('serves a PDF for a dispatched order, issued once and served the same after', async () => {
      const order = await makeOrder({
        scope: 'inv',
        status: 'dispatched',
        dispatchedAt: '2026-06-18T02:00:00Z',
      })

      const first = await get(`/orders/${order.orderNumber}/invoice`).buffer(
        true,
      )
      const second = await get(`/orders/${order.orderNumber}/invoice`).buffer(
        true,
      )

      expect(first.status).toBe(200)
      expect(first.headers['content-type']).toBe('application/pdf')
      expect(first.headers['content-disposition']).toBe(
        `attachment; filename="${order.orderNumber}-invoice.pdf"`,
      )
      expect(first.body.subarray(0, 5).toString()).toBe('%PDF-')
      expect(second.body.equals(first.body)).toBe(true)
      const rows = await dataSource.query(
        `SELECT seller_business_name AS "name" FROM invoice WHERE order_id = $1`,
        [order.orderId],
      )
      expect(rows).toEqual([{ name: supplierA.name }])
    })

    it('serves a delivered order too', async () => {
      const order = await makeOrder({
        scope: 'inv-delivered',
        status: 'delivered',
        dispatchedAt: '2026-06-18T02:00:00Z',
        deliveredAt: '2026-06-20T02:00:00Z',
      })

      const response = await get(`/orders/${order.orderNumber}/invoice`)

      expect(response.status).toBe(200)
    })

    it.each(['placed', 'confirmed', 'picking', 'cancelled'] as const)(
      'refuses a %s order with 409, issuing nothing',
      async (status) => {
        const order = await makeOrder({ scope: `inv-${status}`, status })

        const response = await get(`/orders/${order.orderNumber}/invoice`)

        expect(response.status).toBe(409)
        expect(response.body.error).toBe('ECB409')
        const [{ count }] = await dataSource.query(
          `SELECT count(*)::int AS count FROM invoice WHERE order_id = $1`,
          [order.orderId],
        )
        expect(count).toBe(0)
      },
    )

    it('answers 404 for an order that does not exist and 400 for a malformed number', async () => {
      expect((await get('/orders/ORD-2098-99999/invoice')).status).toBe(404)
      expect((await get('/orders/nope/invoice')).status).toBe(400)
    })
  })

  describe('GET /orders/export', () => {
    const header = [
      'Order number',
      'Customer',
      'Supplier',
      'Placed (UTC)',
      'Total (GST incl.)',
      'Payment status',
      'Payment method',
      'Fulfilment',
    ]

    // Fetches as text; the body is a CSV, which supertest does not parse into a string.
    const download = async (scope: string, query = '') => {
      const response = await exportOf(scope, query)
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = []
          res.on('data', (chunk: Buffer) => chunks.push(chunk))
          res.on('end', () => callback(null, Buffer.concat(chunks)))
        })
      const raw = response.body as Buffer
      return { response, raw, text: raw.toString('utf8') }
    }

    it('sends a CSV file with the headers a browser needs to save it', async () => {
      await makeOrder({ scope: 'exp-headers' })

      const { response } = await download('exp-headers')

      expect(response.status).toBe(200)
      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8')
      expect(response.headers['content-disposition']).toMatch(
        /^attachment; filename="orders-\d{4}-\d{2}-\d{2}\.csv"$/,
      )
      expect(response.headers['cache-control']).toBe('no-store')
    })

    it('names the file by the UTC date', async () => {
      await makeOrder({ scope: 'exp-name' })

      const { response } = await download('exp-name')

      const today = new Date().toISOString().slice(0, 10)
      expect(response.headers['content-disposition']).toContain(
        `orders-${today}.csv`,
      )
    })

    it('starts with a UTF-8 byte order mark and ends every record with CRLF', async () => {
      await makeOrder({ scope: 'exp-format' })

      const { raw, text } = await download('exp-format')

      expect([...raw.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
      expect(text.endsWith('\r\n')).toBe(true)
      expect(text.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/)
      expect(text.slice(1).split('\r\n')[0]).toBe(header.join(','))
    })

    it('writes the same rows as the table, in the same order', async () => {
      await makeOrder({
        scope: 'exp-rows',
        total: '234.00',
        payment: 'paid',
        status: 'delivered',
        placedAt: '2026-06-17T01:00:00Z',
      })
      await makeOrder({
        scope: 'exp-rows',
        total: '64.50',
        payment: null,
        status: 'placed',
        placedAt: '2026-06-18T01:00:00Z',
        supplier: supplierB,
      })
      const table = (await listOf('exp-rows')).body.data

      const { text } = await download('exp-rows')
      const rows = parseCsv(text.replace(/^﻿/, ''))

      expect(rows[0]).toEqual(header)
      expect(rows.slice(1)).toEqual(
        table.map(
          (item: {
            orderNumber: string
            customerName: string
            supplierName: string
            placedAt: string
            total: string
            payment: { status: string; method: string } | null
            fulfilment: string
          }) => [
            item.orderNumber,
            item.customerName,
            item.supplierName,
            item.placedAt,
            item.total,
            item.payment?.status ?? '',
            item.payment?.method ?? '',
            item.fulfilment,
          ],
        ),
      )
      expect(rows[2]).toEqual([
        expect.any(String),
        orgName('exp-rows'),
        supplierA.name,
        '2026-06-17T01:00:00.000Z',
        '234.00',
        'paid',
        'card_mock',
        'delivered',
      ])
    })

    it('applies the payment, fulfilment, search and sort the table has', async () => {
      await makeOrder({
        scope: 'exp-filter',
        status: 'delivered',
        payment: 'paid',
        total: '30.00',
      })
      await makeOrder({
        scope: 'exp-filter',
        status: 'delivered',
        payment: 'paid',
        total: '10.00',
      })
      await makeOrder({
        scope: 'exp-filter',
        status: 'delivered',
        payment: 'failed',
      })
      await makeOrder({
        scope: 'exp-filter',
        status: 'picking',
        payment: 'paid',
      })
      const numbers = async (query: string) =>
        parseCsv((await download('exp-filter', query)).text.replace(/^﻿/, ''))
          .slice(1)
          .map((row) => `${row[7]}:${row[5]}:${row[4]}`)

      expect(
        await numbers(
          '&payment=paid&fulfilment=delivered&orderField=total&order=ASC',
        ),
      ).toEqual(['delivered:paid:10.00', 'delivered:paid:30.00'])
      expect(await numbers('&fulfilment=picking')).toEqual([
        'picking:paid:11.00',
      ])
      expect(await numbers('&payment=failed')).toHaveLength(1)
      expect(await numbers('')).toHaveLength(4)
    })

    it('writes just the header for a search that matches nothing', async () => {
      const { response, text } = await download('exp-nothing-matches-this')

      expect(response.status).toBe(200)
      expect(parseCsv(text.replace(/^﻿/, ''))).toEqual([header])
    })

    it.each([['page=2'], ['limit=5'], ['payment=maybe'], ['orderField=x']])(
      'rejects %s',
      async (query) => {
        expect((await get(`/orders/export?${query}`)).status).toBe(400)
      },
    )

    it('quotes a name with a comma, a quote or a line break, so it stays one cell', async () => {
      const name = `E2E Ord ${run} exp-quote, "Best" & Co\nLine two`
      await makeOrder({ scope: 'exp-quote', organisation: name })

      const response = await get(
        `/orders/export?search=${encodeURIComponent(
          `E2E Ord ${run} exp-quote`,
        )}`,
      )
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = []
          res.on('data', (chunk: Buffer) => chunks.push(chunk))
          res.on('end', () => callback(null, Buffer.concat(chunks)))
        })
      const rows = parseCsv(
        (response.body as Buffer).toString('utf8').replace(/^﻿/, ''),
      )

      expect(rows).toHaveLength(2)
      expect(rows[1]).toHaveLength(header.length)
      expect(rows[1][1]).toBe(name)
    })

    it.each([
      ['=', `=E2E-INJECT-${run}()`],
      ['+', `+E2E-INJECT-${run}`],
      ['-', `-E2E-INJECT-${run}`],
      ['@', `@E2E-INJECT-${run}`],
    ])(
      'defuses a customer name that starts with %s, so a spreadsheet shows it as text',
      async (_label, name) => {
        await makeOrder({ scope: 'exp-inject', organisation: name })

        const response = await get(
          `/orders/export?search=${encodeURIComponent(`E2E-INJECT-${run}`)}`,
        )
          .buffer(true)
          .parse((res, callback) => {
            const chunks: Buffer[] = []
            res.on('data', (chunk: Buffer) => chunks.push(chunk))
            res.on('end', () => callback(null, Buffer.concat(chunks)))
          })
        const rows = parseCsv(
          (response.body as Buffer).toString('utf8').replace(/^﻿/, ''),
        )

        const cells = rows.slice(1).map((row) => row[1])
        expect(cells).toContain(`'${name}`)
        expect(cells).not.toContain(name)
      },
    )

    it('streams more orders than one database batch, each exactly once and in order', async () => {
      const orgId = await insertOrganisation(orgName('exp-big'))
      await dataSource.query(
        `INSERT INTO "order" (order_number, user_id, organisation_id, supplier_profile_id, status,
                              subtotal, gst_total, total, placed_at)
         SELECT 'ORD-2097-' || lpad(g::text, 5, '0'), $1, $2, $3, 'placed', 9, 1, g,
                '2026-01-01T00:00:00Z'::timestamptz + (g || ' minutes')::interval
         FROM generate_series(1, 1250) g`,
        [buyerId, orgId, supplierA.profileId],
      )
      try {
        const { response, text } = await download(
          'exp-big',
          '&orderField=total&order=ASC',
        )
        const rows = parseCsv(text.replace(/^﻿/, '')).slice(1)

        expect(response.status).toBe(200)
        expect(rows).toHaveLength(1250)
        expect(new Set(rows.map((row) => row[0])).size).toBe(1250)
        expect(rows.map((row) => Number(row[4]))).toEqual(
          Array.from({ length: 1250 }, (_, i) => i + 1),
        )
        const newestFirst = await download('exp-big')
        const times = parseCsv(newestFirst.text.replace(/^﻿/, ''))
          .slice(1)
          .map((row) => row[3])
        expect(times).toEqual([...times].sort().reverse())
      } finally {
        await dataSource.query(
          `DELETE FROM "order" WHERE order_number LIKE 'ORD-2097-%' AND user_id = $1`,
          [buyerId],
        )
      }
    })

    it('leaves out an order placed after the export began, though the table still shows it', async () => {
      await makeOrder({ scope: 'exp-cutoff', placedAt: '2026-06-01T00:00:00Z' })
      const future = await makeOrder({
        scope: 'exp-cutoff',
        placedAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      })

      const table = await listOf('exp-cutoff')
      const { text } = await download('exp-cutoff')
      const exported = parseCsv(text.replace(/^﻿/, ''))
        .slice(1)
        .map((row) => row[0])

      expect(
        table.body.data.map((r: { orderNumber: string }) => r.orderNumber),
      ).toContain(future.orderNumber)
      expect(exported).toHaveLength(1)
      expect(exported).not.toContain(future.orderNumber)
    })

    describe('the row cap', () => {
      const withCap = async (cap: string, fn: () => Promise<void>) => {
        process.env.ORDER_EXPORT_MAX_ROWS = cap
        try {
          await fn()
        } finally {
          delete process.env.ORDER_EXPORT_MAX_ROWS
        }
      }

      it('refuses an export over the cap with a JSON 400, before sending any file', async () => {
        for (let i = 0; i < 3; i += 1) {
          await makeOrder({ scope: 'exp-cap-over' })
        }

        await withCap('2', async () => {
          const response = await exportOf('exp-cap-over')

          expect(response.status).toBe(400)
          expect(response.headers['content-type']).toContain('application/json')
          expect(response.headers['content-disposition']).toBeUndefined()
          expect(response.body.error).toBe('ECB001')
          expect(response.body.message).toContain('narrow the filters')
        })
      })

      it('allows exactly the cap, and a narrower filter under it', async () => {
        await makeOrder({ scope: 'exp-cap-exact', payment: 'paid' })
        await makeOrder({ scope: 'exp-cap-exact', payment: 'failed' })
        await makeOrder({ scope: 'exp-cap-exact', payment: 'failed' })

        await withCap('3', async () => {
          expect((await exportOf('exp-cap-exact')).status).toBe(200)
        })
        await withCap('2', async () => {
          expect((await exportOf('exp-cap-exact')).status).toBe(400)
          expect(
            (await exportOf('exp-cap-exact', '&payment=failed')).status,
          ).toBe(200)
        })
      })

      it('does not limit the table', async () => {
        for (let i = 0; i < 3; i += 1) {
          await makeOrder({ scope: 'exp-cap-list' })
        }

        await withCap('1', async () => {
          const response = await listOf('exp-cap-list')

          expect(response.status).toBe(200)
          expect(response.body.data).toHaveLength(3)
        })
      })

      it('falls back to the default when the setting is not a number', async () => {
        await makeOrder({ scope: 'exp-cap-bad' })

        await withCap('lots', async () => {
          expect((await exportOf('exp-cap-bad')).status).toBe(200)
        })
      })
    })

    it('logs who exported how many rows, without names or filters', async () => {
      await makeOrder({
        scope: 'exp-log',
        organisation: `E2E Ord ${run} exp-log Secret Co`,
      })
      await makeOrder({
        scope: 'exp-log',
        organisation: `E2E Ord ${run} exp-log Secret Co`,
      })
      const log = jest.spyOn(Logger.prototype, 'log')

      try {
        await download('exp-log', '&payment=paid')

        const messages = log.mock.calls.map((call) => String(call[0]))
        const line = messages.find((message) =>
          message.startsWith('Order export'),
        )
        expect(line).toBe(`Order export by admin ${admin.id}: 2 rows`)
        expect(messages.join('\n')).not.toContain('Secret')
      } finally {
        log.mockRestore()
      }
    })
  })
})
