import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AllExceptionsFilter } from '@sa-marketplace/common'
import * as request from 'supertest'
import { DataSource } from 'typeorm'
import { API_PREFIX } from '../src/app.constant'
import { AppModule } from '../src/app.module'
import { AppValidationPipe } from '../src/app.pipe'

// Needs the local DB (pnpm db:up, db:seed). Uses its own fresh buyer, removed in afterAll.
describe('Cart (e2e)', () => {
  let app: INestApplication
  let dataSource: DataSource

  const base = '/api/customer/v1'
  const run = Date.now()
  const email = `e2e.cart.${run}@example.com`
  let token: string
  let buyerId: string

  let chain: { id: string; price: string } // COC-004, $12.00, plenty of stock
  let gloves: { id: string; price: string } // NGL-007, $15.50, plenty of stock
  let hair: { id: string; quantity: number } // HFT-003, only 12 in stock
  let wipes: { id: string; price: string } // SUP-028 — dedicated to the stock-drop test below
  let draftProductId: string
  let retiredProductId: string
  let unapprovedSupplierProductId: string

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

    const registered = await request(app.getHttpServer())
      .post(`${base}/auth/register`)
      .send({
        email,
        password: 'Password123!',
        firstName: 'Cart',
        lastName: 'Tester',
        organisation: `E2E Cart Org ${run}`,
        acceptTerms: true,
      })
    token = registered.body.access_token as string
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
        `SELECT id, quantity FROM product WHERE sku = 'HFT-003'`,
      )
    )[0]
    wipes = (
      await dataSource.query(
        `SELECT id, price FROM product WHERE sku = 'SUP-028'`,
      )
    )[0]
    draftProductId = (
      await dataSource.query(`SELECT id FROM product WHERE sku = 'BSB-008'`)
    )[0].id
    retiredProductId = (
      await dataSource.query(`SELECT id FROM product WHERE sku = 'LST-010'`)
    )[0].id
    unapprovedSupplierProductId = (
      await dataSource.query(`SELECT id FROM product WHERE sku = 'SSP-009'`)
    )[0].id
  })

  afterAll(async () => {
    await dataSource.query(
      `DELETE FROM cart_item WHERE cart_id IN (SELECT id FROM cart WHERE user_id = $1)`,
      [buyerId],
    )
    await dataSource.query(`DELETE FROM cart WHERE user_id = $1`, [buyerId])
    await dataSource.query(`DELETE FROM user_role WHERE user_id = $1`, [
      buyerId,
    ])
    await dataSource.query(`DELETE FROM "user" WHERE id = $1`, [buyerId])
    await dataSource.query(`DELETE FROM organisation WHERE name = $1`, [
      `E2E Cart Org ${run}`,
    ])
    await app.close()
  })

  const auth = () => ({ Authorization: `Bearer ${token}` })
  const getCart = () =>
    request(app.getHttpServer()).get(`${base}/cart`).set(auth())
  const addItem = (productId: string, quantity?: number) =>
    request(app.getHttpServer())
      .post(`${base}/cart/items`)
      .set(auth())
      .send({ productId, quantity })
  const patchItem = (productId: string, quantity: number) =>
    request(app.getHttpServer())
      .patch(`${base}/cart/items/${productId}`)
      .set(auth())
      .send({ quantity })
  const deleteItem = (productId: string) =>
    request(app.getHttpServer())
      .delete(`${base}/cart/items/${productId}`)
      .set(auth())
  const clearCart = () =>
    request(app.getHttpServer()).delete(`${base}/cart`).set(auth())

  describe('GET /cart', () => {
    it('refuses a request with no token', async () => {
      const response = await request(app.getHttpServer()).get(`${base}/cart`)

      expect(response.status).toBe(401)
    })

    it('is empty for a fresh buyer', async () => {
      await clearCart()
      const response = await getCart()

      expect(response.status).toBe(200)
      expect(response.body.items).toEqual([])
      expect(response.body.summary).toEqual({
        itemCount: 0,
        total: '0.00',
        gstIncluded: '0.00',
      })
    })
  })

  describe('POST /cart/items', () => {
    beforeEach(async () => {
      await clearCart()
    })

    it('adds a new product, live price and supplier included', async () => {
      const response = await addItem(chain.id, 2)

      expect(response.status).toBe(201)
      expect(response.body.items).toHaveLength(1)
      expect(response.body.items[0]).toMatchObject({
        productId: chain.id,
        price: chain.price,
        quantity: 2,
        unavailableReason: null,
        supplierName: 'Bindi MedSupply Pty Ltd',
      })
    })

    it('accumulates on repeat add, rather than replacing', async () => {
      await addItem(chain.id, 2)
      const response = await addItem(chain.id, 3)

      expect(response.body.items).toHaveLength(1)
      expect(response.body.items[0].quantity).toBe(5)
    })

    it('rejects a quantity beyond available stock', async () => {
      const response = await addItem(hair.id, hair.quantity + 1)

      expect(response.status).toBe(409)
      expect(response.body.error).toBe('ECB409')
      expect(response.body.message).toContain(`${hair.quantity} available`)

      // Rejected as a whole — no partial line was created.
      const cart = await getCart()
      expect(cart.body.items).toHaveLength(0)
    })

    it.each([
      ['draft', () => draftProductId],
      ['retired', () => retiredProductId],
      ['from an unapproved supplier', () => unapprovedSupplierProductId],
    ])('rejects a product that is %s', async (_label, getId) => {
      const response = await addItem(getId(), 1)

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('ECB404')
    })

    it('rejects a nonexistent product', async () => {
      const response = await addItem('00000000-0000-0000-0000-000000000000', 1)

      expect(response.status).toBe(404)
    })
  })

  describe('PATCH /cart/items/:productId', () => {
    beforeEach(async () => {
      await clearCart()
    })

    it('sets the exact quantity of an existing line', async () => {
      await addItem(chain.id, 2)
      const response = await patchItem(chain.id, 7)

      expect(response.status).toBe(200)
      expect(response.body.items[0].quantity).toBe(7)
    })

    it('quantity 0 removes the line', async () => {
      await addItem(chain.id, 2)
      const response = await patchItem(chain.id, 0)

      expect(response.status).toBe(200)
      expect(response.body.items).toHaveLength(0)
    })

    it('quantity 0 on a line not in the cart is a harmless no-op', async () => {
      const response = await patchItem(chain.id, 0)

      expect(response.status).toBe(200)
      expect(response.body.items).toHaveLength(0)
    })

    it('a positive quantity on a line not in the cart is 404', async () => {
      const response = await patchItem(chain.id, 3)

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('ECB404')
    })

    it('rejects a quantity beyond available stock', async () => {
      await addItem(hair.id, 1)
      const response = await patchItem(hair.id, hair.quantity + 1)

      expect(response.status).toBe(409)
      expect(response.body.error).toBe('ECB409')
    })
  })

  describe('DELETE /cart/items/:productId', () => {
    it('removes one line, leaving the others', async () => {
      await clearCart()
      await addItem(chain.id, 1)
      await addItem(gloves.id, 1)

      const response = await deleteItem(chain.id)

      expect(response.status).toBe(200)
      expect(response.body.items).toHaveLength(1)
      expect(response.body.items[0].productId).toBe(gloves.id)
    })
  })

  describe('DELETE /cart', () => {
    it('empties the cart', async () => {
      await addItem(chain.id, 1)
      await addItem(gloves.id, 1)

      const response = await clearCart()

      expect(response.status).toBe(200)
      expect(response.body.items).toHaveLength(0)
    })
  })

  describe('unavailableReason and totals', () => {
    it('flags a line whose live stock dropped below the cart quantity, and excludes it from the total', async () => {
      await clearCart()
      await addItem(wipes.id, 5)
      await addItem(chain.id, 2) // stays orderable throughout

      const [{ quantity: stockBefore }] = await dataSource.query(
        `SELECT quantity FROM product WHERE id = $1`,
        [wipes.id],
      )
      await dataSource.query(`UPDATE product SET quantity = 3 WHERE id = $1`, [
        wipes.id,
      ])

      const response = await getCart()

      expect(response.status).toBe(200)
      const wipesLine = response.body.items.find(
        (item: { productId: string }) => item.productId === wipes.id,
      )
      expect(wipesLine.unavailableReason).toBe('Only 3 left in stock')

      // The unavailable line is excluded from the total — only chain's 2 count.
      const chainLineTotal = (Number(chain.price) * 2).toFixed(2)
      expect(response.body.summary.total).toBe(chainLineTotal)
      expect(response.body.summary.itemCount).toBe(2)

      await dataSource.query(`UPDATE product SET quantity = $2 WHERE id = $1`, [
        wipes.id,
        stockBefore,
      ])
    })
  })
})
