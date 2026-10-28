import * as fs from 'fs/promises'
import { INestApplication, VersioningType } from '@nestjs/common'
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

// Needs the local DB (pnpm db:up, db:seed). Reads use seeded data; reorder places and cleans up its own order.
describe('Orders (e2e)', () => {
  let app: INestApplication
  let dataSource: DataSource

  const base = '/api/customer/v1'

  const login = async (email: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post(`${base}/auth/login`)
      .send({ email, password: 'Password123!' })
    return response.body.access_token as string
  }
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` })

  // Seeded buyers: t.beckett (2 orders), n.alvarez (delivered), s.chen (others' orders), o.fraser (cancelled).
  let beckettToken: string
  let alvarezToken: string
  let chenToken: string
  let fraserToken: string

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

    beckettToken = await login('t.beckett@worksafe.com.au')
    alvarezToken = await login('n.alvarez@safetycorp.com.au')
    chenToken = await login('s.chen@miningco.com.au')
    fraserToken = await login('o.fraser@transportltd.com.au')
  })

  afterAll(async () => {
    await app.close()
  })

  describe('GET /orders', () => {
    it('refuses a request with no token', async () => {
      const response = await request(app.getHttpServer()).get(`${base}/orders`)

      expect(response.status).toBe(401)
    })

    it("lists only the signed-in buyer's orders, newest first by default", async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/orders`)
        .set(auth(beckettToken))

      expect(response.status).toBe(200)
      expect(response.body.pagingMeta.totalItem).toBe(2)
      expect(
        response.body.data.map((o: { orderNumber: string }) => o.orderNumber),
      ).toEqual([
        'ORD-2026-00126', // placed 2026-08-31 — later
        'ORD-2026-00122', // placed 2026-08-10 — earlier
      ])
    })

    it('filters by status', async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/orders`)
        .query({ status: 'placed' })
        .set(auth(beckettToken))

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].orderNumber).toBe('ORD-2026-00126')
    })

    it('finds an order by part of its number, together with the other filters', async () => {
      const part = await request(app.getHttpServer())
        .get(`${base}/orders`)
        .query({ search: '00126' })
        .set(auth(beckettToken))
      const withStatus = await request(app.getHttpServer())
        .get(`${base}/orders`)
        .query({ search: '2026', status: 'placed' })
        .set(auth(beckettToken))
      const none = await request(app.getHttpServer())
        .get(`${base}/orders`)
        .query({ search: '99999' })
        .set(auth(beckettToken))

      expect(
        part.body.data.map((o: { orderNumber: string }) => o.orderNumber),
      ).toEqual(['ORD-2026-00126'])
      expect(
        withStatus.body.data.map((o: { orderNumber: string }) => o.orderNumber),
      ).toEqual(['ORD-2026-00126'])
      expect(none.body.data).toEqual([])
      expect(none.body.pagingMeta.totalItem).toBe(0)
    })

    it('treats % and _ in the search literally, not as wildcards', async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/orders`)
        .query({ search: '%' })
        .set(auth(beckettToken))

      expect(response.status).toBe(200)
      expect(response.body.data).toEqual([])
    })

    it('sorts by total, ascending', async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/orders`)
        .query({ orderField: 'total', order: 'ASC' })
        .set(auth(beckettToken))

      expect(response.status).toBe(200)
      expect(
        response.body.data.map((o: { orderNumber: string }) => o.orderNumber),
      ).toEqual([
        'ORD-2026-00122', // 49.98
        'ORD-2026-00126', // 155.00
      ])
    })

    it('rejects an orderField outside the allow-list', async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/orders`)
        .query({ orderField: 'id' })
        .set(auth(beckettToken))

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('ECB001')
    })

    it('paginates with limit and page', async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/orders`)
        .query({ limit: 1, page: 2 })
        .set(auth(beckettToken))

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.pagingMeta).toMatchObject({
        page: 2,
        limit: 1,
        totalItem: 2,
        totalPage: 2,
        hasPreviousPage: true,
        hasNextPage: false,
      })
    })

    it('shows real carrier and tracking info for a dispatched/delivered order', async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/orders`)
        .set(auth(alvarezToken))

      expect(response.status).toBe(200)
      const [order] = response.body.data
      expect(order.orderNumber).toBe('ORD-2026-00123')
      expect(order.status).toBe('delivered')
      expect(order.delivery.carrierName).toBe('Australia Post')
      expect(order.delivery.trackingNumber).toBe('AU9100000123')
      expect(order.items).toEqual([
        { productName: 'Chain of Custody Forms (50pk)', quantity: 5 },
      ])
    })
  })

  describe('GET /orders/:orderNumber', () => {
    it('refuses a request with no token', async () => {
      const response = await request(app.getHttpServer()).get(
        `${base}/orders/ORD-2026-00123`,
      )

      expect(response.status).toBe(401)
    })

    it('rejects a malformed order number before it reaches the database', async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/orders/not-an-order`)
        .set(auth(alvarezToken))

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('ECB001')
    })

    it('returns 404 for an order number that does not exist', async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/orders/ORD-2026-99999`)
        .set(auth(alvarezToken))

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('ECB404')
    })

    it("returns 404 for another buyer's order — identical to a missing one (ADR 0025)", async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/orders/ORD-2026-00125`) // s.chen's order
        .set(auth(alvarezToken))

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('ECB404')
      expect(response.body.message).toBe('Order not found')

      // Proves it really exists — just not visible to this token.
      const asOwner = await request(app.getHttpServer())
        .get(`${base}/orders/ORD-2026-00125`)
        .set(auth(chenToken))
      expect(asOwner.status).toBe(200)
    })

    it("returns the full priced detail for the buyer's own order", async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/orders/ORD-2026-00123`)
        .set(auth(alvarezToken))

      expect(response.status).toBe(200)
      const detail = response.body
      expect(detail.orderNumber).toBe('ORD-2026-00123')
      expect(detail.supplierName).toBe('Bindi MedSupply Pty Ltd')
      expect(detail.cancellationReason).toBeNull()
      expect(detail.subtotal).toBe('54.55')
      expect(detail.gstTotal).toBe('5.45')
      expect(detail.total).toBe('60.00')
      expect(detail.items).toEqual([
        {
          productId: expect.any(String),
          productName: 'Chain of Custody Forms (50pk)',
          sku: 'COC-004',
          quantity: 5,
          unitPrice: '12.00',
          lineTotal: '60.00',
        },
      ])
      expect(detail.delivery.carrierName).toBe('Australia Post')
      expect(detail.delivery.trackingNumber).toBe('AU9100000123')
      expect(detail.payment.method).toBe('card_mock')
      expect(detail.payment.status).toBe('paid')
      expect(detail.payment.cardLast4).toMatch(/^\d{4}$/)
      // Never leaked, because there is no field for them (§4.6).
      expect(detail.payment.cardNumber).toBeUndefined()
      expect(detail.payment.cvc).toBeUndefined()
    })

    it('surfaces the cancellation reason for a cancelled order', async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/orders/ORD-2026-00128`)
        .set(auth(fraserToken))

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('cancelled')
      expect(response.body.cancellationReason).toContain('Out of stock')
    })

    it('never includes an invoiceNumber — the invoice may not exist yet (GET /orders/:orderNumber/invoice does)', async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/orders/ORD-2026-00123`)
        .set(auth(alvarezToken))

      expect(response.status).toBe(200)
      expect(response.body.invoiceNumber).toBeUndefined()
    })
  })

  // Downloading creates an invoice row and a PDF on disk, so this block cleans up after itself.
  describe('order lines', () => {
    const orderNumber = `ORD-2099-${(Date.now() % 80000) + 10000}`
    let orderId: string

    beforeAll(async () => {
      const [{ id: userId }] = await dataSource.query(
        `SELECT id FROM "user" WHERE email = 't.beckett@worksafe.com.au'`,
      )
      const [product] = await dataSource.query(
        `SELECT id, supplier_profile_id AS "profileId" FROM product WHERE sku = 'COC-004'`,
      )
      const [order] = await dataSource.query(
        `INSERT INTO "order" (order_number, user_id, supplier_profile_id, status, subtotal,
                              gst_total, total, placed_at)
         VALUES ($1, $2, $3, 'placed', 9.00, 1.00, 10.00, now()) RETURNING id`,
        [orderNumber, userId, product.profileId],
      )
      orderId = order.id
      // Row ids that sort Zulu before Alpha, so ordering by id would give the wrong answer every time.
      const prefix = `00000000-0000-4000-8000-${String(Date.now())
        .padStart(11, '0')
        .slice(-11)}`
      for (const [suffix, name] of [
        ['1', 'Zulu item'],
        ['2', 'Alpha item'],
      ]) {
        await dataSource.query(
          `INSERT INTO order_item (id, order_id, product_id, product_name, sku, quantity,
                                   unit_price_at_purchase, line_total)
           VALUES ($1::uuid, $2, $3, $4, 'E2E-LINE', 1, 5.00, 5.00)`,
          [`${prefix}${suffix}`, orderId, product.id, name],
        )
      }
      await dataSource.query(
        `INSERT INTO delivery (order_id, street_address, suburb, state, postcode)
         VALUES ($1, '1 Test St', 'Parramatta', 'NSW', '2150')`,
        [orderId],
      )
      await dataSource.query(
        `INSERT INTO payment (order_id, method, status, amount) VALUES ($1, 'card_mock', 'paid', 10.00)`,
        [orderId],
      )
    })

    afterAll(async () => {
      await dataSource.query(`DELETE FROM payment WHERE order_id = $1`, [
        orderId,
      ])
      await dataSource.query(`DELETE FROM delivery WHERE order_id = $1`, [
        orderId,
      ])
      await dataSource.query(`DELETE FROM order_item WHERE order_id = $1`, [
        orderId,
      ])
      await dataSource.query(`DELETE FROM "order" WHERE id = $1`, [orderId])
    })

    it('lists the lines of an order by product name, not by row id', async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/orders/${orderNumber}`)
        .set(auth(beckettToken))

      expect(response.status).toBe(200)
      expect(
        response.body.items.map((i: { productName: string }) => i.productName),
      ).toEqual(['Alpha item', 'Zulu item'])
    })
  })

  describe('GET /orders/:orderNumber/invoice', () => {
    const createdInvoiceNumbers: string[] = []

    afterAll(async () => {
      if (createdInvoiceNumbers.length === 0) {
        return
      }
      const rows: { pdfPath: string }[] = await dataSource.query(
        `SELECT pdf_path AS "pdfPath" FROM invoice WHERE invoice_number = ANY($1)`,
        [createdInvoiceNumbers],
      )
      await dataSource.query(
        `DELETE FROM invoice WHERE invoice_number = ANY($1)`,
        [createdInvoiceNumbers],
      )
      await Promise.all(
        rows.map((row) =>
          fs.rm(resolveInvoicePdfPath(row.pdfPath), { force: true }),
        ),
      )
    })

    it('refuses a request with no token', async () => {
      const response = await request(app.getHttpServer()).get(
        `${base}/orders/ORD-2026-00123/invoice`,
      )

      expect(response.status).toBe(401)
    })

    it('rejects an order that has not dispatched yet', async () => {
      // ORD-2026-00126 is 'placed' (see GET /orders filters-by-status test above).
      const response = await request(app.getHttpServer())
        .get(`${base}/orders/ORD-2026-00126/invoice`)
        .set(auth(beckettToken))

      expect(response.status).toBe(409)
      expect(response.body.message).toBe(
        'The invoice is not available until this order has dispatched',
      )
    })

    it("returns 404 for another buyer's order, identical to the detail endpoint (ADR 0025)", async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/orders/ORD-2026-00123/invoice`) // n.alvarez's order
        .set(auth(chenToken))

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('ECB404')
    })

    it('downloads a real PDF, creates the invoice row with frozen details, and reuses it on a repeat download', async () => {
      const first = await request(app.getHttpServer())
        .get(`${base}/orders/ORD-2026-00123/invoice`)
        .set(auth(alvarezToken))

      expect(first.status).toBe(200)
      expect(first.headers['content-type']).toBe('application/pdf')
      expect(first.headers['content-disposition']).toContain(
        'ORD-2026-00123-invoice.pdf',
      )
      // The real PDF magic bytes — proves this is a rendered file, not a stub.
      expect(Buffer.from(first.body).subarray(0, 4).toString()).toBe('%PDF')

      const [row] = await dataSource.query(
        `SELECT invoice_number AS "invoiceNumber", seller_business_name AS "sellerBusinessName",
                seller_abn AS "sellerAbn", i.total
         FROM invoice i JOIN "order" o ON o.id = i.order_id
         WHERE o.order_number = 'ORD-2026-00123'`,
      )
      expect(row.invoiceNumber).toMatch(/^INV-\d{4}-\d{5}$/)
      expect(row.sellerBusinessName).toBe('Bindi MedSupply Pty Ltd')
      expect(row.total).toBe('60.00')
      createdInvoiceNumbers.push(row.invoiceNumber)

      // Second download reuses the stored file — same invoice number, no new row.
      const second = await request(app.getHttpServer())
        .get(`${base}/orders/ORD-2026-00123/invoice`)
        .set(auth(alvarezToken))
      expect(second.status).toBe(200)

      const rowsAfter: unknown[] = await dataSource.query(
        `SELECT 1 FROM invoice i JOIN "order" o ON o.id = i.order_id
         WHERE o.order_number = 'ORD-2026-00123'`,
      )
      expect(rowsAfter).toHaveLength(1)
    })
  })

  // Places one real order, then reorders it; the stock it consumes is restored in afterAll.
  // Capture the stock baseline right before mutating, never assume it (ADR 0023).
  describe('POST /orders/:orderNumber/reorder', () => {
    const run = Date.now()
    const email = `e2e.reorder.${run}@example.com`
    let reorderToken: string
    let reorderBuyerId: string
    let reorderedOrderNumber: string
    let chain: { id: string; name: string } // COC-004, plenty of stock

    beforeAll(async () => {
      const registered = await request(app.getHttpServer())
        .post(`${base}/auth/register`)
        .send({
          email,
          password: 'Password123!',
          firstName: 'Reo',
          lastName: 'Tester',
          organisation: 'Mining Co Pty Ltd',
          acceptTerms: true,
        })
      reorderToken = registered.body.access_token
      reorderBuyerId = (
        await dataSource.query(`SELECT id FROM "user" WHERE email = $1`, [
          email,
        ])
      )[0].id

      chain = (
        await dataSource.query(
          `SELECT id, name FROM product WHERE sku = 'COC-004'`,
        )
      )[0]

      await request(app.getHttpServer())
        .post(`${base}/cart/items`)
        .set(auth(reorderToken))
        .send({ productId: chain.id, quantity: 2 })

      const checkoutResponse = await request(app.getHttpServer())
        .post(`${base}/checkout`)
        .set(auth(reorderToken))
        .send({
          delivery: {
            streetAddress: '1 Reorder St',
            suburb: 'Parramatta',
            state: 'NSW',
            postcode: '2150',
          },
          payment: { method: 'invoice_on_account' },
        })
      reorderedOrderNumber = checkoutResponse.body.orders[0].orderNumber
    })

    afterAll(async () => {
      await dataSource.query(
        `DELETE FROM payment WHERE order_id IN (SELECT id FROM "order" WHERE user_id = $1)`,
        [reorderBuyerId],
      )
      await dataSource.query(
        `DELETE FROM delivery WHERE order_id IN (SELECT id FROM "order" WHERE user_id = $1)`,
        [reorderBuyerId],
      )
      await dataSource.query(
        `DELETE FROM order_item WHERE order_id IN (SELECT id FROM "order" WHERE user_id = $1)`,
        [reorderBuyerId],
      )
      await dataSource.query(`DELETE FROM "order" WHERE user_id = $1`, [
        reorderBuyerId,
      ])
      await dataSource.query(
        `DELETE FROM cart_item WHERE cart_id IN (SELECT id FROM cart WHERE user_id = $1)`,
        [reorderBuyerId],
      )
      await dataSource.query(`DELETE FROM cart WHERE user_id = $1`, [
        reorderBuyerId,
      ])
      await dataSource.query(`DELETE FROM user_role WHERE user_id = $1`, [
        reorderBuyerId,
      ])
      await dataSource.query(`DELETE FROM "user" WHERE id = $1`, [
        reorderBuyerId,
      ])
      // The one real checkout above consumed 2 units; give them back.
      await dataSource.query(
        `UPDATE product SET quantity = quantity + 2 WHERE id = $1`,
        [chain.id],
      )
    })

    it('refuses a request with no token', async () => {
      const response = await request(app.getHttpServer()).post(
        `${base}/orders/${reorderedOrderNumber}/reorder`,
      )

      expect(response.status).toBe(401)
    })

    it("returns 404 for another buyer's order — reorder never touches the cart in that case", async () => {
      const response = await request(app.getHttpServer())
        .post(`${base}/orders/ORD-2026-00123/reorder`) // n.alvarez's order
        .set(auth(reorderToken))

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('ECB404')
    })

    it('adds the order line to the cart at the live price, additively on repeat (ADR 0026)', async () => {
      await request(app.getHttpServer())
        .delete(`${base}/cart`)
        .set(auth(reorderToken))

      const first = await request(app.getHttpServer())
        .post(`${base}/orders/${reorderedOrderNumber}/reorder`)
        .set(auth(reorderToken))

      expect(first.status).toBe(201)
      expect(first.body.lines).toEqual([
        {
          productId: chain.id,
          productName: chain.name,
          requestedQuantity: 2,
          added: true,
          reason: null,
        },
      ])
      expect(first.body.cart.items).toHaveLength(1)
      expect(first.body.cart.items[0].quantity).toBe(2)

      const second = await request(app.getHttpServer())
        .post(`${base}/orders/${reorderedOrderNumber}/reorder`)
        .set(auth(reorderToken))

      expect(second.body.cart.items[0].quantity).toBe(4)
    })

    it('skips a line that is now out of stock, leaving the cart untouched', async () => {
      await request(app.getHttpServer())
        .delete(`${base}/cart`)
        .set(auth(reorderToken))

      const [{ quantity: stockBefore }] = await dataSource.query(
        `SELECT quantity FROM product WHERE id = $1`,
        [chain.id],
      )
      await dataSource.query(`UPDATE product SET quantity = 0 WHERE id = $1`, [
        chain.id,
      ])

      const response = await request(app.getHttpServer())
        .post(`${base}/orders/${reorderedOrderNumber}/reorder`)
        .set(auth(reorderToken))

      expect(response.status).toBe(201)
      expect(response.body.lines).toEqual([
        {
          productId: chain.id,
          productName: chain.name,
          requestedQuantity: 2,
          added: false,
          reason: expect.stringContaining('Not enough stock'),
        },
      ])
      expect(response.body.cart.items).toHaveLength(0)

      await dataSource.query(`UPDATE product SET quantity = $2 WHERE id = $1`, [
        chain.id,
        stockBefore,
      ])
    })
  })
})
