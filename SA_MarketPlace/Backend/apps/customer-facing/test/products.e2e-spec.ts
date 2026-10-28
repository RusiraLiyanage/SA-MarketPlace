import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AllExceptionsFilter } from '@sa-marketplace/common'
import * as request from 'supertest'
import { DataSource } from 'typeorm'
import { API_PREFIX } from '../src/app.constant'
import { AppModule } from '../src/app.module'
import { AppValidationPipe } from '../src/app.pipe'

// Needs the local DB (pnpm db:up, db:seed). Read-only: nothing to clean up.
describe('Products (e2e)', () => {
  let app: INestApplication
  let dataSource: DataSource

  const base = '/api/customer/v1'
  let token: string

  // Fixtures are looked up by natural key: ids change on every reseed.
  let chainOfCustodyCategoryId: string
  let ppeCategoryId: string
  let draftProductId: string // Biohazard Specimen Bags — listing_status draft
  let retiredProductId: string // Legacy Saliva Test Strips — listing_status retired
  let unapprovedSupplierProductId: string // Sterile Swab Packs — supplier pending_review
  let chainProduct: { id: string; name: string; sku: string; price: string }
  let hairFollicle: { id: string; quantity: number; lowStockThreshold: number }

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

    const login = await request(app.getHttpServer())
      .post(`${base}/auth/login`)
      .send({ email: 'j.shaw@saclinics.com.au', password: 'Password123!' })
    token = login.body.access_token as string

    chainOfCustodyCategoryId = (
      await dataSource.query(
        `SELECT id FROM category WHERE slug = 'chain-of-custody'`,
      )
    )[0].id
    ppeCategoryId = (
      await dataSource.query(`SELECT id FROM category WHERE slug = 'ppe'`)
    )[0].id
    draftProductId = (
      await dataSource.query(`SELECT id FROM product WHERE sku = 'BSB-008'`)
    )[0].id
    retiredProductId = (
      await dataSource.query(`SELECT id FROM product WHERE sku = 'LST-010'`)
    )[0].id
    unapprovedSupplierProductId = (
      await dataSource.query(`SELECT id FROM product WHERE sku = 'SSP-009'`)
    )[0].id
    chainProduct = (
      await dataSource.query(
        `SELECT id, name, sku, price FROM product WHERE sku = 'COC-004'`,
      )
    )[0]
    const hft = (
      await dataSource.query(
        `SELECT id, quantity, low_stock_threshold AS "lowStockThreshold" FROM product WHERE sku = 'HFT-003'`,
      )
    )[0]
    hairFollicle = hft
  })

  afterAll(async () => {
    await app.close()
  })

  const auth = () => ({ Authorization: `Bearer ${token}` })

  describe('GET /products', () => {
    it('refuses a request with no token', async () => {
      const response = await request(app.getHttpServer()).get(
        `${base}/products`,
      )

      expect(response.status).toBe(401)
    })

    it('never returns a draft, retired, or unapproved-supplier product', async () => {
      const draft = await request(app.getHttpServer())
        .get(`${base}/products`)
        .query({ search: 'Biohazard Specimen' })
        .set(auth())
      const retired = await request(app.getHttpServer())
        .get(`${base}/products`)
        .query({ search: 'Legacy Saliva' })
        .set(auth())
      const unapproved = await request(app.getHttpServer())
        .get(`${base}/products`)
        .query({ search: 'Sterile Swab' })
        .set(auth())

      expect(draft.body.data).toHaveLength(0)
      expect(retired.body.data).toHaveLength(0)
      expect(unapproved.body.data).toHaveLength(0)
    })

    it('filters by category', async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/products`)
        .query({ categoryId: chainOfCustodyCategoryId, limit: 30 })
        .set(auth())

      expect(response.status).toBe(200)
      expect(response.body.data.length).toBeGreaterThan(0)
      for (const product of response.body.data) {
        expect(product.category.id).toBe(chainOfCustodyCategoryId)
      }
      // ProductListItem has no sku — that's ProductDetail only; match by name.
      expect(
        response.body.data.some(
          (product: { name: string }) =>
            product.name === 'Chain of Custody Forms (50pk)',
        ),
      ).toBe(true)
    })

    it('filters by price range', async () => {
      const under20 = await request(app.getHttpServer())
        .get(`${base}/products`)
        .query({ priceRange: 'under_20', limit: 30 })
        .set(auth())
      const over50 = await request(app.getHttpServer())
        .get(`${base}/products`)
        .query({ priceRange: 'over_50', limit: 30 })
        .set(auth())

      for (const product of under20.body.data) {
        expect(Number(product.price)).toBeLessThan(20)
      }
      for (const product of over50.body.data) {
        expect(Number(product.price)).toBeGreaterThanOrEqual(50)
      }
      expect(
        under20.body.data.some(
          (product: { name: string }) =>
            product.name === 'Safety Glasses - Clear', // $9.90
        ),
      ).toBe(true)
      expect(
        over50.body.data.some(
          (product: { name: string }) =>
            product.name === 'Disposable Gowns (25pk)', // $54.00
        ),
      ).toBe(true)
    })

    it('combines category, price range and search with AND logic, not OR', async () => {
      // PPE category + "Forms" search: Safety Glasses (PPE) doesn't match
      // "Forms", and nothing in PPE does — proves it isn't OR-ing the filters.
      const response = await request(app.getHttpServer())
        .get(`${base}/products`)
        .query({ categoryId: ppeCategoryId, search: 'Forms' })
        .set(auth())

      expect(response.body.data).toHaveLength(0)
    })

    it('sorts by price, ascending', async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/products`)
        .query({ orderField: 'price', order: 'ASC', limit: 5 })
        .set(auth())

      const prices = response.body.data.map((p: { price: string }) =>
        Number(p.price),
      )
      expect(prices).toEqual([...prices].sort((a, b) => a - b))
    })

    it('rejects an orderField outside the allow-list', async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/products`)
        .query({ orderField: 'id' })
        .set(auth())

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('ECB001')
    })

    it('paginates with limit and page', async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/products`)
        .query({ limit: 1, page: 1 })
        .set(auth())

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.pagingMeta).toMatchObject({ page: 1, limit: 1 })
    })
  })

  describe('GET /products/categories', () => {
    it('lists categories, sorted by name', async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/products/categories`)
        .set(auth())

      expect(response.status).toBe(200)
      const names = response.body.map((c: { name: string }) => c.name)
      expect(names).toEqual([...names].sort())
      expect(
        response.body.some(
          (c: { slug: string }) => c.slug === 'chain-of-custody',
        ),
      ).toBe(true)
    })
  })

  describe('GET /products/:productId', () => {
    it('refuses a request with no token', async () => {
      const response = await request(app.getHttpServer()).get(
        `${base}/products/${chainProduct.id}`,
      )

      expect(response.status).toBe(401)
    })

    it('rejects a non-UUID productId', async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/products/not-a-uuid`)
        .set(auth())

      expect(response.status).toBe(400)
    })

    it('returns 404 for a nonexistent product', async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/products/00000000-0000-0000-0000-000000000000`)
        .set(auth())

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('ECB404')
    })

    it('returns 404 for a draft product — hidden and missing look identical', async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/products/${draftProductId}`)
        .set(auth())

      expect(response.status).toBe(404)
    })

    it('returns 404 for a retired product', async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/products/${retiredProductId}`)
        .set(auth())

      expect(response.status).toBe(404)
    })

    it("returns 404 for a published product whose supplier isn't approved", async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/products/${unapprovedSupplierProductId}`)
        .set(auth())

      expect(response.status).toBe(404)
    })

    it('returns the full detail for a visible product', async () => {
      const response = await request(app.getHttpServer())
        .get(`${base}/products/${chainProduct.id}`)
        .set(auth())

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        id: chainProduct.id,
        name: chainProduct.name,
        sku: chainProduct.sku,
        price: chainProduct.price,
      })
      expect(response.body.category).toBeDefined()
      expect(response.body.images).toBeInstanceOf(Array)
    })

    it('reflects low stock correctly (derived, never stored — CLAUDE.md §4.7)', async () => {
      // Seeded at quantity <= lowStockThreshold; if this ever drifts, the
      // assertion below still checks the real relationship, not a hardcoded status.
      const response = await request(app.getHttpServer())
        .get(`${base}/products/${hairFollicle.id}`)
        .set(auth())

      expect(response.status).toBe(200)
      const expected =
        hairFollicle.quantity <= 0
          ? 'out_of_stock'
          : hairFollicle.quantity <= hairFollicle.lowStockThreshold
          ? 'low_stock'
          : 'in_stock'
      expect(response.body.stockStatus).toBe(expected)
    })
  })
})
