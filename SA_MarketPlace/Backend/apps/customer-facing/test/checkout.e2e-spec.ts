import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AllExceptionsFilter } from '@sa-marketplace/common'
import * as request from 'supertest'
import { DataSource } from 'typeorm'
import { API_PREFIX } from '../src/app.constant'
import { AppModule } from '../src/app.module'
import { AppValidationPipe } from '../src/app.pipe'
import { fromCents, gstIncludedInCents, toCents } from '../src/utils/money'

// Needs the local DB (pnpm db:up, db:seed). Places real orders; afterAll deletes them and restores stock.
// Run the whole file: jest -t skips the buyer registered by beforeAll.
describe('Checkout (e2e)', () => {
  let app: INestApplication
  let dataSource: DataSource
  let token: string
  let buyerId: string

  const base = '/api/customer/v1'
  const run = Date.now()
  const email = `e2e.checkout.${run}@example.com`

  // Real seeded products, both with plenty of stock so a few units is trivially safe.
  let chain: { id: string; price: string } // Bindi, $12.00
  let gloves: { id: string; price: string } // SafetyFirst, $15.50
  let hair: { id: string } // 12 in stock — used to go over stock without touching it
  let retired: { id: string; name: string } // hidden from buyers

  // Cents taken from real stock across the whole file; restored once at the end.
  const stockConsumed = new Map<string, number>()
  const consume = (productId: string, quantity: number) =>
    stockConsumed.set(productId, (stockConsumed.get(productId) ?? 0) + quantity)

  const auth = () => ({ Authorization: `Bearer ${token}` })
  const addToCart = (productId: string, quantity: number) =>
    request(app.getHttpServer())
      .post(`${base}/cart/items`)
      .set(auth())
      .send({ productId, quantity })
  const clearCart = () =>
    request(app.getHttpServer()).delete(`${base}/cart`).set(auth())
  const checkout = (body: object) =>
    request(app.getHttpServer()).post(`${base}/checkout`).set(auth()).send(body)

  const validDelivery = {
    attentionName: 'Ellie Tester',
    streetAddress: '1 Test Street',
    suburb: 'Parramatta',
    state: 'NSW',
    postcode: '2150',
    notes: 'e2e test order',
  }
  const cardMock = (number: string) => ({
    method: 'card_mock',
    card: {
      number,
      expiryMonth: 12,
      expiryYear: 2030,
      cvc: '123',
      nameOnCard: 'Ellie Tester',
    },
  })
  const invoiceOnAccount = { method: 'invoice_on_account' }

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

    // Reuses a seeded organisation, so there is no stray organisation to clean up.
    const registered = await request(app.getHttpServer())
      .post(`${base}/auth/register`)
      .send({
        email,
        password: 'Password123!',
        firstName: 'Ellie',
        lastName: 'Tester',
        organisation: 'Mining Co Pty Ltd',
        acceptTerms: true,
      })
    token = registered.body.access_token
    buyerId = (
      await dataSource.query(`SELECT id FROM "user" WHERE email = $1`, [email])
    )[0].id

    chain = (
      await dataSource.query(
        `SELECT id, price FROM product WHERE sku = 'COC-004'`,
      )
    )[0]
    gloves = (
      await dataSource.query(
        `SELECT id, price FROM product WHERE sku = 'NGL-007'`,
      )
    )[0]
    hair = (
      await dataSource.query(
        `SELECT id FROM product WHERE name = 'Hair Follicle Test Kit'`,
      )
    )[0]
    retired = (
      await dataSource.query(
        `SELECT id, name FROM product WHERE listing_status = 'retired' LIMIT 1`,
      )
    )[0]
  })

  afterAll(async () => {
    for (const [productId, quantity] of stockConsumed) {
      await dataSource.query(
        `UPDATE product SET quantity = quantity + $2 WHERE id = $1`,
        [productId, quantity],
      )
    }
    // Every order this run created belongs only to this fresh buyer.
    await dataSource.query(
      `DELETE FROM payment WHERE order_id IN (SELECT id FROM "order" WHERE user_id = $1)`,
      [buyerId],
    )
    await dataSource.query(
      `DELETE FROM delivery WHERE order_id IN (SELECT id FROM "order" WHERE user_id = $1)`,
      [buyerId],
    )
    await dataSource.query(
      `DELETE FROM order_item WHERE order_id IN (SELECT id FROM "order" WHERE user_id = $1)`,
      [buyerId],
    )
    await dataSource.query(`DELETE FROM "order" WHERE user_id = $1`, [buyerId])
    await dataSource.query(
      `DELETE FROM cart_item WHERE cart_id IN (SELECT id FROM cart WHERE user_id = $1)`,
      [buyerId],
    )
    await dataSource.query(`DELETE FROM cart WHERE user_id = $1`, [buyerId])
    await dataSource.query(`DELETE FROM user_role WHERE user_id = $1`, [
      buyerId,
    ])
    await dataSource.query(`DELETE FROM "user" WHERE id = $1`, [buyerId])
    await app.close()
  })

  describe('guards and validation', () => {
    it('refuses a request with no token', async () => {
      const response = await request(app.getHttpServer())
        .post(`${base}/checkout`)
        .send({ delivery: validDelivery, payment: invoiceOnAccount })

      expect(response.status).toBe(401)
    })

    it('rejects a body missing delivery', async () => {
      const response = await checkout({ payment: invoiceOnAccount })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('ECB001')
    })
  })

  describe('happy paths', () => {
    beforeEach(async () => {
      await clearCart()
    })

    it('places a single-supplier order, paid by card, and reduces stock', async () => {
      await addToCart(chain.id, 3)

      const response = await checkout({
        delivery: validDelivery,
        payment: cardMock('4242424242424242'),
      })

      expect(response.status).toBe(201)
      const { orders, payment, total } = response.body

      const lineCents = toCents(chain.price) * 3
      expect(orders).toHaveLength(1)
      expect(orders[0].supplierName).toBe('Bindi MedSupply Pty Ltd')
      expect(orders[0].orderNumber).toMatch(/^ORD-\d{4}-\d{5}$/)
      expect(orders[0].total).toBe(fromCents(lineCents))
      expect(orders[0].gstTotal).toBe(fromCents(gstIncludedInCents(lineCents)))
      expect(payment.status).toBe('paid')
      expect(payment.cardLast4).toBe('4242')
      expect(payment.transactionReference).toMatch(/^MOCK-/)
      expect(total).toBe(fromCents(lineCents))
      consume(chain.id, 3)

      // The order actually exists, and the cart was actually emptied.
      const [savedOrder] = await dataSource.query(
        `SELECT status, total FROM "order" WHERE order_number = $1`,
        [orders[0].orderNumber],
      )
      expect(savedOrder.status).toBe('placed')
      expect(savedOrder.total).toBe(fromCents(lineCents))

      const cart = await request(app.getHttpServer())
        .get(`${base}/cart`)
        .set(auth())
      expect(cart.body.items).toHaveLength(0)
    })

    it('splits a mixed-supplier cart into two orders sharing one payment', async () => {
      await addToCart(chain.id, 2)
      await addToCart(gloves.id, 2)

      const response = await checkout({
        delivery: validDelivery,
        payment: invoiceOnAccount,
      })

      expect(response.status).toBe(201)
      const { orders, payment, total } = response.body

      expect(orders).toHaveLength(2)
      const bySupplier = Object.fromEntries(
        orders.map((o: { supplierName: string }) => [o.supplierName, o]),
      )
      const chainCents = toCents(chain.price) * 2
      const glovesCents = toCents(gloves.price) * 2
      expect(bySupplier['Bindi MedSupply Pty Ltd'].total).toBe(
        fromCents(chainCents),
      )
      expect(bySupplier['SafetyFirst Distribution'].total).toBe(
        fromCents(glovesCents),
      )
      // Different suppliers, different SLAs: the two estimates should not be forced equal.
      expect(
        bySupplier['Bindi MedSupply Pty Ltd'].estimatedDeliveryAt,
      ).not.toBe(bySupplier['SafetyFirst Distribution'].estimatedDeliveryAt)

      expect(payment.status).toBe('pending')
      expect(payment.cardLast4).toBeNull()
      expect(payment.cardBrand).toBeNull()
      expect(total).toBe(fromCents(chainCents + glovesCents))

      consume(chain.id, 2)
      consume(gloves.id, 2)

      const [{ count }] = await dataSource.query(
        `SELECT count(*)::int FROM "order" WHERE user_id = $1`,
        [buyerId],
      )
      expect(count).toBe(3) // this test's 2, plus the single-supplier test's 1
    })
  })

  describe('business rule failures — nothing is written', () => {
    beforeEach(async () => {
      await clearCart()
    })

    it('rejects an empty cart', async () => {
      const before = await dataSource.query(
        `SELECT count(*)::int AS count FROM "order" WHERE user_id = $1`,
        [buyerId],
      )

      const response = await checkout({
        delivery: validDelivery,
        payment: invoiceOnAccount,
      })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('ECB001')
      const after = await dataSource.query(
        `SELECT count(*)::int AS count FROM "order" WHERE user_id = $1`,
        [buyerId],
      )
      expect(after[0].count).toBe(before[0].count)
    })

    it('rejects a cart holding a hidden (retired) product', async () => {
      const cart = (
        await dataSource.query(`SELECT id FROM cart WHERE user_id = $1`, [
          buyerId,
        ])
      )[0]
      // Bypasses the cart API's own visibility check, to simulate a product that
      // was hidden after it was added — the same case checkout must catch itself.
      await dataSource.query(
        `INSERT INTO cart_item (cart_id, product_id, quantity) VALUES ($1, $2, 1)`,
        [cart.id, retired.id],
      )

      const response = await checkout({
        delivery: validDelivery,
        payment: invoiceOnAccount,
      })

      expect(response.status).toBe(409)
      expect(response.body.error).toBe('ECB409')
      expect(response.body.message).toContain(retired.name)
    })

    it('rejects a cart line asking for more than the current stock', async () => {
      const cart = (
        await dataSource.query(`SELECT id FROM cart WHERE user_id = $1`, [
          buyerId,
        ])
      )[0]
      // Bypasses the cart API's own stock cap, to simulate stock that dropped after
      // the line was added.
      await dataSource.query(
        `INSERT INTO cart_item (cart_id, product_id, quantity) VALUES ($1, $2, 999)`,
        [cart.id, hair.id],
      )

      const response = await checkout({
        delivery: validDelivery,
        payment: invoiceOnAccount,
      })

      expect(response.status).toBe(409)
      expect(response.body.error).toBe('ECB409')
    })

    it('rejects a declined card, leaves stock and the cart untouched', async () => {
      await addToCart(chain.id, 1)
      const [{ quantity: stockBefore }] = await dataSource.query(
        `SELECT quantity FROM product WHERE id = $1`,
        [chain.id],
      )

      const response = await checkout({
        delivery: validDelivery,
        payment: cardMock('4000000000000002'),
      })

      expect(response.status).toBe(402)
      expect(response.body.error).toBe('ECB402')

      const [{ quantity: stockAfter }] = await dataSource.query(
        `SELECT quantity FROM product WHERE id = $1`,
        [chain.id],
      )
      expect(stockAfter).toBe(stockBefore)

      // The transaction rolled back, so the line the buyer added is still there.
      const cart = await request(app.getHttpServer())
        .get(`${base}/cart`)
        .set(auth())
      expect(cart.body.items).toHaveLength(1)
    })

    it('rejects a card that fails the Luhn check', async () => {
      await addToCart(chain.id, 1)

      const response = await checkout({
        delivery: validDelivery,
        payment: cardMock('4242424242424241'),
      })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('ECB001')
    })
  })
})
