// The suite logs in a lot; the rate limit has its own spec.
process.env.AUTH_THROTTLE_LIMIT = '1000'

import { promises as fs } from 'fs'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import {
  AllExceptionsFilter,
  resolveProductImagePath,
} from '@sa-marketplace/common'
import * as request from 'supertest'
import { DataSource } from 'typeorm'
import { API_PREFIX } from '../src/app.constant'
import { AppModule } from '../src/app.module'
import { AppValidationPipe } from '../src/app.pipe'

// Requires the local database: pnpm db:up, pnpm db:seed. Sellers and products are created per
// run and removed in afterAll (with their image files); seeded sellers are never touched.
describe('Catalogue management (e2e)', () => {
  let app: INestApplication
  let dataSource: DataSource

  const base = '/api/supplier/v1'
  const run = Date.now()
  const createdEmails: string[] = []
  const createdProductIds: string[] = []
  let sellerCount = 0
  let skuCount = 0

  let topCategoryId: string
  let subCategoryId: string
  let otherSubCategoryId: string
  let subCategoryParentId: string

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` })
  const http = () => request(app.getHttpServer())

  // Smallest byte strings the file-type check accepts.
  const jpeg = () =>
    Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)])
  const png = () =>
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(32),
    ])
  const webp = () =>
    Buffer.concat([
      Buffer.from('RIFF'),
      Buffer.alloc(4),
      Buffer.from('WEBP'),
      Buffer.alloc(16),
    ])
  const notAnImage = () => Buffer.from('plain text pretending to be a jpg')

  type Seller = { email: string; token: string; profileId: string }

  // Registers a real seller; `state` forces its application status.
  const makeSeller = async (
    label: string,
    state: 'approved' | 'pending' = 'approved',
  ): Promise<Seller> => {
    sellerCount += 1
    const email = `e2e.cat.${label}.${sellerCount}.${run}@example.com`
    createdEmails.push(email)

    const registered = await http()
      .post(`${base}/auth/register`)
      .send({
        businessName: `E2E Cat ${label} ${run}`,
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

  const uniqueSku = () => {
    skuCount += 1
    return `E2E-${run}-${skuCount}`
  }

  // A product straight into the table, for the list tests.
  const addProduct = async (
    seller: Seller,
    values: {
      name: string
      sku?: string
      price?: string
      quantity?: number
      lowStockThreshold?: number
      listingStatus?: 'published' | 'draft' | 'retired'
    },
  ): Promise<string> => {
    const [{ id }] = await dataSource.query(
      `INSERT INTO product (supplier_profile_id, category_id, name, description, sku, price,
                            quantity, low_stock_threshold, listing_status)
       VALUES ($1, $2, $3, 'Test product', $4, $5, $6, $7, $8) RETURNING id`,
      [
        seller.profileId,
        topCategoryId,
        values.name,
        values.sku ?? uniqueSku(),
        values.price ?? '10.00',
        values.quantity ?? 10,
        values.lowStockThreshold ?? 2,
        values.listingStatus ?? 'published',
      ],
    )
    createdProductIds.push(id)
    return id
  }

  type Upload = { buffer: Buffer; name: string }
  const upload = (buffer: Buffer, name = 'image.jpg'): Upload => ({
    buffer,
    name,
  })

  // Multipart create or update; JSON when there are no files.
  const send = (
    method: 'post' | 'patch',
    path: string,
    token: string,
    fields: Record<string, string | string[]> = {},
    files: Upload[] = [],
  ) => {
    const call = http()[method](`${base}${path}`).set(auth(token))
    if (files.length === 0) return call.send(fields)
    for (const [key, value] of Object.entries(fields)) {
      for (const item of Array.isArray(value) ? value : [value]) {
        call.field(key, item)
      }
    }
    for (const file of files) call.attach('images', file.buffer, file.name)
    return call
  }

  const validFields = (overrides: Record<string, string> = {}) => ({
    name: 'E2E Kit',
    sku: uniqueSku(),
    price: '12.5',
    categoryId: subCategoryId,
    ...overrides,
  })

  // Creates through the API and tracks the product for cleanup.
  const createProduct = async (
    seller: Seller,
    overrides: Record<string, string> = {},
    files: Upload[] = [],
  ) => {
    const response = await send(
      'post',
      '/catalogue',
      seller.token,
      validFields(overrides),
      files,
    )
    if (response.body?.id) createdProductIds.push(response.body.id)
    return response
  }

  const getProduct = (seller: Seller, id: string) =>
    http().get(`${base}/catalogue/${id}`).set(auth(seller.token))

  const dbImages = async (productId: string) =>
    await (dataSource.query(
      `SELECT id, path, sort_order AS "sortOrder", is_primary AS "isPrimary", alt_text AS "altText"
       FROM product_image WHERE product_id = $1 ORDER BY sort_order`,
      [productId],
    ) as Promise<
      {
        id: string
        path: string
        sortOrder: number
        isPrimary: boolean
        altText: string
      }[]
    >)

  const fileExists = (relativePath: string) =>
    fs
      .access(resolveProductImagePath(relativePath))
      .then(() => true)
      .catch(() => false)

  const productDir = () => resolveProductImagePath('products')
  const filesOnDisk = async () =>
    await fs.readdir(productDir()).catch(() => [] as string[])

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

    topCategoryId = (
      await dataSource.query(`SELECT id FROM category WHERE slug = 'supplies'`)
    )[0].id
    const [sub] = await dataSource.query(
      `SELECT id, parent_id AS "parentId" FROM category WHERE slug = 'oral-fluid'`,
    )
    subCategoryId = sub.id
    subCategoryParentId = sub.parentId
    otherSubCategoryId = (
      await dataSource.query(
        `SELECT id FROM category WHERE parent_id IS NOT NULL AND id <> $1 LIMIT 1`,
        [subCategoryId],
      )
    )[0].id
  })

  afterAll(async () => {
    // Files first: deleting the products cascades to their image rows.
    const rows: { path: string }[] = await dataSource.query(
      `SELECT path FROM product_image WHERE product_id = ANY($1)`,
      [createdProductIds],
    )
    await Promise.all(
      rows.map((row) =>
        fs.rm(resolveProductImagePath(row.path), { force: true }),
      ),
    )
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

  describe('access', () => {
    const someId = '00000000-0000-4000-8000-000000000000'
    const routes: [string, string][] = [
      ['get', '/catalogue'],
      ['get', '/catalogue/categories'],
      ['get', `/catalogue/${someId}`],
      ['post', '/catalogue'],
      ['patch', `/catalogue/${someId}`],
      ['post', `/catalogue/${someId}/retire`],
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

  describe('GET /catalogue (the table)', () => {
    let seller: Seller
    let other: Seller
    const list = (query: Record<string, unknown> = {}, who?: Seller) =>
      http()
        .get(`${base}/catalogue`)
        .query(query)
        .set(auth((who ?? seller).token))
    const names = (response: request.Response) =>
      response.body.data.map((p: { name: string }) => p.name)

    beforeAll(async () => {
      seller = await makeSeller('list')
      other = await makeSeller('list-other')
      await addProduct(seller, {
        name: 'Alpha Kit',
        sku: 'L-A',
        price: '10.00',
        quantity: 50,
        lowStockThreshold: 10,
      })
      await addProduct(seller, {
        name: 'Bravo Test',
        sku: 'L-B',
        price: '30.00',
        quantity: 5,
        lowStockThreshold: 10,
      })
      await addProduct(seller, {
        name: 'Charlie Cup',
        sku: 'L-C',
        price: '20.00',
        quantity: 0,
        lowStockThreshold: 5,
      })
      await addProduct(seller, {
        name: 'Delta Draft',
        sku: 'L-D',
        price: '5.00',
        quantity: 0,
        lowStockThreshold: 5,
        listingStatus: 'draft',
      })
      await addProduct(seller, {
        name: 'Echo Old',
        sku: 'L-E',
        price: '8.00',
        quantity: 0,
        lowStockThreshold: 0,
        listingStatus: 'retired',
      })
      await addProduct(seller, {
        name: 'Foxtrot 100%',
        sku: 'L-F',
        price: '15.00',
        quantity: 100,
        lowStockThreshold: 10,
      })
      await addProduct(other, { name: 'Not Yours', sku: 'L-A' })
    })

    it("lists only this seller's products, A to Z by default, every status", async () => {
      const response = await list()

      expect(response.status).toBe(200)
      expect(names(response)).toEqual([
        'Alpha Kit',
        'Bravo Test',
        'Charlie Cup',
        'Delta Draft',
        'Echo Old',
        'Foxtrot 100%',
      ])
      expect(response.body.data[0]).toEqual({
        id: expect.any(String),
        name: 'Alpha Kit',
        sku: 'L-A',
        price: '10.00',
        quantity: 50,
        listingStatus: 'published',
      })
      expect(response.body.pagingMeta).toMatchObject({
        page: 1,
        totalItem: 6,
        totalPage: 1,
      })
    })

    it("never shows another seller's products, and an empty catalogue is a normal answer", async () => {
      const empty = await makeSeller('list-empty')

      const response = await list({}, empty)

      expect(response.status).toBe(200)
      expect(response.body.data).toEqual([])
      expect(response.body.lowStock).toEqual([])
      expect(response.body.pagingMeta.totalItem).toBe(0)
    })

    it.each([
      ['published', ['Alpha Kit', 'Bravo Test', 'Charlie Cup', 'Foxtrot 100%']],
      ['draft', ['Delta Draft']],
      ['retired', ['Echo Old']],
    ])('filters by status %s', async (status, expected) => {
      const response = await list({ status })

      expect(names(response)).toEqual(expected)
    })

    it('searches the name and the SKU, ignoring case', async () => {
      expect(names(await list({ search: 'bravo' }))).toEqual(['Bravo Test'])
      expect(names(await list({ search: 'l-c' }))).toEqual(['Charlie Cup'])
    })

    it('treats % in a search as a literal, not a wildcard', async () => {
      const response = await list({ search: '%' })

      expect(names(response)).toEqual(['Foxtrot 100%'])
    })

    it('combines a status filter with a search', async () => {
      const response = await list({ status: 'published', search: 'a' })

      expect(names(response)).toEqual([
        'Alpha Kit',
        'Bravo Test',
        'Charlie Cup',
      ])
    })

    it('sorts by price and by stock, either way', async () => {
      expect(
        names(await list({ orderField: 'price', order: 'DESC', limit: 3 })),
      ).toEqual(['Bravo Test', 'Charlie Cup', 'Foxtrot 100%'])
      expect(
        names(await list({ orderField: 'quantity', order: 'DESC', limit: 3 })),
      ).toEqual(['Foxtrot 100%', 'Alpha Kit', 'Bravo Test'])
    })

    it('pages, and a page past the end is empty with the right totals', async () => {
      const second = await list({ limit: 2, page: 2 })
      const past = await list({ limit: 2, page: 99 })

      expect(names(second)).toEqual(['Charlie Cup', 'Delta Draft'])
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

    it('rejects a sort field or status outside the allow-list', async () => {
      expect(
        (await list({ orderField: 'id; DROP TABLE product' })).status,
      ).toBe(400)
      expect((await list({ status: 'nope' })).status).toBe(400)
    })

    it('warns about published products at or below their threshold, least stock first', async () => {
      const response = await list()

      expect(response.body.lowStock).toEqual([
        { id: expect.any(String), name: 'Charlie Cup', quantity: 0 },
        { id: expect.any(String), name: 'Bravo Test', quantity: 5 },
      ])
    })

    it('keeps the warning when a filter or page hides those rows', async () => {
      const draftTab = await list({ status: 'draft' })
      const searched = await list({ search: 'alpha' })

      expect(
        draftTab.body.lowStock.map((p: { name: string }) => p.name),
      ).toEqual(['Charlie Cup', 'Bravo Test'])
      expect(searched.body.lowStock).toHaveLength(2)
    })

    it('never warns about a draft or retired product, however empty', async () => {
      const response = await list()

      const warned = response.body.lowStock.map((p: { name: string }) => p.name)
      expect(warned).not.toContain('Delta Draft')
      expect(warned).not.toContain('Echo Old')
    })
  })

  describe('GET /catalogue/categories', () => {
    it('returns top-level categories with their sub-categories, matching the database', async () => {
      const seller = await makeSeller('categories')
      const [{ tops }] = await dataSource.query(
        `SELECT count(*)::int AS tops FROM category WHERE parent_id IS NULL`,
      )
      const [{ subs }] = await dataSource.query(
        `SELECT count(*)::int AS subs FROM category WHERE parent_id IS NOT NULL`,
      )

      const response = await http()
        .get(`${base}/catalogue/categories`)
        .set(auth(seller.token))

      expect(response.status).toBe(200)
      expect(response.body).toHaveLength(tops)
      expect(
        response.body.reduce(
          (n: number, c: { children: unknown[] }) => n + c.children.length,
          0,
        ),
      ).toBe(subs)
      expect(response.body.map((c: { name: string }) => c.name)).toEqual(
        [...response.body.map((c: { name: string }) => c.name)].sort(),
      )
      const parent = response.body.find(
        (c: { id: string }) => c.id === subCategoryParentId,
      )
      expect(parent.children).toContainEqual({
        id: subCategoryId,
        name: expect.any(String),
      })
    })
  })

  describe('POST /catalogue', () => {
    let seller: Seller

    beforeAll(async () => {
      seller = await makeSeller('create')
    })

    describe('validation', () => {
      it('refuses an empty body, naming what is missing', async () => {
        const response = await send('post', '/catalogue', seller.token, {})

        expect(response.status).toBe(400)
        expect(response.body.message).toEqual(expect.stringContaining('name'))
        expect(response.body.message).toEqual(expect.stringContaining('sku'))
        expect(response.body.message).toEqual(expect.stringContaining('price'))
        expect(response.body.message).toEqual(
          expect.stringContaining('categoryId'),
        )
      })

      it.each([
        ['a price of 0', { price: '0' }],
        ['a price of 0.00', { price: '0.00' }],
        ['a price with 3 decimals', { price: '1.234' }],
        ['a negative price', { price: '-5' }],
        ['a price that is not a number', { price: 'abc' }],
        ['a blank name', { name: '   ' }],
        ['a blank SKU', { sku: '' }],
        ['negative stock', { quantity: '-1' }],
        ['stock that is not a whole number', { quantity: '1.5' }],
        ['a retired status', { listingStatus: 'retired' }],
        ['an unknown status', { listingStatus: 'live' }],
        ['a category that is not a UUID', { categoryId: 'oral-fluid' }],
      ])('refuses %s', async (_label, overrides) => {
        const response = await send(
          'post',
          '/catalogue',
          seller.token,
          validFields(overrides),
        )

        expect(response.status).toBe(400)
      })

      it('refuses supplierProfileId in the body: the seller comes from the token', async () => {
        const response = await send('post', '/catalogue', seller.token, {
          ...validFields(),
          supplierProfileId: '00000000-0000-4000-8000-000000000000',
        })

        expect(response.status).toBe(400)
        expect(response.body.message).toContain('supplierProfileId')
      })

      it('refuses to publish without a description, but a draft may leave it out', async () => {
        const published = await createProduct(seller, {
          listingStatus: 'published',
        })
        const draft = await createProduct(seller)

        expect(published.status).toBe(400)
        expect(published.body.message).toContain(
          'description is required to publish',
        )
        expect(draft.status).toBe(201)
      })

      it('refuses a category that does not exist', async () => {
        const response = await createProduct(seller, {
          categoryId: '00000000-0000-4000-8000-000000000000',
        })

        expect(response.status).toBe(400)
        expect(response.body.message).toBe('Category not found')
      })
    })

    describe('saving', () => {
      it('Save draft: the minimum, with defaults and a price stored to 2 decimals', async () => {
        const response = await createProduct(seller, {
          name: '  Spaced Name  ',
          sku: `  E2E-SP-${run}  `,
        })

        expect(response.status).toBe(201)
        expect(response.body).toMatchObject({
          name: 'Spaced Name',
          sku: `E2E-SP-${run}`,
          price: '12.50',
          quantity: 0,
          lowStockThreshold: 0,
          listingStatus: 'draft',
          description: null,
          brand: null,
          images: [],
        })
      })

      it('Publish: every field, as JSON, with blank optional text stored as null', async () => {
        const response = await send('post', '/catalogue', seller.token, {
          ...validFields(),
          description: 'Full description',
          quantity: 5,
          lowStockThreshold: 2,
          brand: 'BrandX',
          manufacturer: '   ',
          packSize: '1 unit',
          certification: 'TGA listed',
          listingStatus: 'published',
        } as never)
        createdProductIds.push(response.body.id)

        expect(response.status).toBe(201)
        expect(response.body).toMatchObject({
          description: 'Full description',
          quantity: 5,
          lowStockThreshold: 2,
          brand: 'BrandX',
          manufacturer: null,
          packSize: '1 unit',
          certification: 'TGA listed',
          listingStatus: 'published',
          categoryId: subCategoryId,
        })
      })

      it('accepts multipart (strings) the same as JSON, treating blank fields as not sent', async () => {
        const response = await createProduct(
          seller,
          { quantity: '3', brand: '', description: '' },
          [upload(jpeg())],
        )

        expect(response.status).toBe(201)
        expect(response.body).toMatchObject({
          quantity: 3,
          brand: null,
          description: null,
        })
      })

      it('belongs to the signed-in seller, whatever the caller does', async () => {
        const response = await createProduct(seller)

        const [row] = await dataSource.query(
          `SELECT supplier_profile_id AS "profileId" FROM product WHERE id = $1`,
          [response.body.id],
        )
        expect(row.profileId).toBe(seller.profileId)
      })

      it('turns a duplicate SKU into 409, unique per seller but not across sellers', async () => {
        const sku = uniqueSku()
        const first = await createProduct(seller, { sku })
        const again = await createProduct(seller, { sku })
        const rival = await makeSeller('create-rival')
        const elsewhere = await createProduct(rival, { sku })

        expect(first.status).toBe(201)
        expect(again.status).toBe(409)
        expect(again.body.message).toBe(
          'You already have a product with this SKU',
        )
        expect(elsewhere.status).toBe(201)
      })

      it('lets only one of several simultaneous requests with one SKU win', async () => {
        const sku = uniqueSku()

        const results = await Promise.all(
          [1, 2, 3, 4, 5].map(() => createProduct(seller, { sku })),
        )

        expect(results.map((r) => r.status).sort()).toEqual([
          201, 409, 409, 409, 409,
        ])
      })
    })

    describe('images', () => {
      it('stores up to 4, in the order sent, the first as primary, files and rows matching', async () => {
        const response = await createProduct(seller, {}, [
          upload(jpeg(), 'a.jpg'),
          upload(png(), 'b.png'),
          upload(webp(), 'c.webp'),
        ])

        expect(response.status).toBe(201)
        const images = response.body.images
        expect(images.map((i: { sortOrder: number }) => i.sortOrder)).toEqual([
          0, 1, 2,
        ])
        expect(images.map((i: { isPrimary: boolean }) => i.isPrimary)).toEqual([
          true,
          false,
          false,
        ])
        expect(
          images.map((i: { path: string }) => i.path.split('.').pop()),
        ).toEqual(['jpg', 'png', 'webp'])
        for (const image of images) {
          expect(image.path).toMatch(
            /^products\/[0-9a-f-]{36}\.(jpg|png|webp)$/,
          )
          expect(await fileExists(image.path)).toBe(true)
          expect(image.altText).toBe('E2E Kit')
        }
        expect(await dbImages(response.body.id)).toHaveLength(3)
      })

      it('decides the type from the bytes, not the name or declared type', async () => {
        const before = await filesOnDisk()

        const fake = await createProduct(seller, {}, [
          upload(notAnImage(), 'looks-real.jpg'),
        ])
        const mixed = await createProduct(seller, {}, [
          upload(jpeg()),
          upload(notAnImage(), 'b.png'),
        ])

        expect(fake.status).toBe(400)
        expect(fake.body.message).toBe('Images must be JPEG, PNG or WebP')
        expect(mixed.status).toBe(400)
        expect(await filesOnDisk()).toEqual(before)
      })

      it('stores a real PNG that is named .jpg under its true extension', async () => {
        const response = await createProduct(seller, {}, [
          upload(png(), 'wrongly-named.jpg'),
        ])

        expect(response.status).toBe(201)
        expect(response.body.images[0].path).toMatch(/\.png$/)
      })

      it('refuses a fifth image with a message that says what to change', async () => {
        const before = await filesOnDisk()

        const response = await createProduct(seller, {}, [
          upload(jpeg()),
          upload(jpeg()),
          upload(jpeg()),
          upload(jpeg()),
          upload(jpeg()),
        ])

        expect(response.status).toBe(400)
        expect(response.body.message).toBe(
          'Attach up to 4 images in the "images" field',
        )
        expect(await filesOnDisk()).toEqual(before)
      })

      it('refuses an image over 5 MB', async () => {
        const big = Buffer.concat([jpeg(), Buffer.alloc(5 * 1024 * 1024 + 1)])

        const response = await createProduct(seller, {}, [upload(big)])

        expect(response.status).toBe(413)
        expect(response.body.message).toBe('Each image must be 5 MB or smaller')
      })

      it('writes nothing when the SKU is a duplicate: the product row comes first', async () => {
        const sku = uniqueSku()
        await createProduct(seller, { sku })
        const before = await filesOnDisk()

        const response = await createProduct(seller, { sku }, [upload(jpeg())])

        expect(response.status).toBe(409)
        expect(await filesOnDisk()).toEqual(before)
      })

      it('rolls back the product when a file cannot be written', async () => {
        const sku = uniqueSku()
        // A plain file where the images folder should be makes every write fail. The real
        // folder is moved aside and put back, never deleted.
        const dir = productDir()
        const aside = `${dir}.e2e-aside-${run}`
        const hadDir = await fs.access(dir).then(
          () => true,
          () => false,
        )
        if (hadDir) await fs.rename(dir, aside)
        await fs.writeFile(dir, 'not a directory')

        let response: request.Response
        try {
          response = await createProduct(seller, { sku }, [upload(jpeg())])
        } finally {
          await fs.rm(dir, { force: true })
          if (hadDir) await fs.rename(aside, dir)
        }

        expect(response.status).toBe(500)
        const [{ count }] = await dataSource.query(
          `SELECT count(*)::int AS count FROM product WHERE sku = $1`,
          [sku],
        )
        expect(count).toBe(0)
      })
    })
  })

  describe('GET /catalogue/:productId', () => {
    let seller: Seller
    let other: Seller

    beforeAll(async () => {
      seller = await makeSeller('get')
      other = await makeSeller('get-other')
    })

    it('returns the product as the edit form needs it, with its images in order', async () => {
      const created = await createProduct(seller, { description: 'Desc' }, [
        upload(jpeg()),
        upload(png()),
      ])

      const response = await getProduct(seller, created.body.id)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        id: created.body.id,
        sku: created.body.sku,
        price: '12.50',
        description: 'Desc',
      })
      expect(response.body.images.map((i: { id: string }) => i.id)).toEqual(
        created.body.images.map((i: { id: string }) => i.id),
      )
    })

    it('splits a sub-category into category (the parent) and subCategory', async () => {
      const created = await createProduct(seller, { categoryId: subCategoryId })

      const response = await getProduct(seller, created.body.id)

      expect(response.body.category.id).toBe(subCategoryParentId)
      expect(response.body.subCategory).toEqual({
        id: subCategoryId,
        name: expect.any(String),
      })
      expect(response.body.categoryId).toBe(subCategoryId)
    })

    it('gives a product in a top-level category no subCategory', async () => {
      const created = await createProduct(seller, { categoryId: topCategoryId })

      const response = await getProduct(seller, created.body.id)

      expect(response.body.category.id).toBe(topCategoryId)
      expect(response.body.subCategory).toBeNull()
    })

    it("is a 404 for another seller's product, identical to a missing one (ADR 0025)", async () => {
      const mine = await createProduct(seller)

      const theirs = await getProduct(other, mine.body.id)
      const missing = await getProduct(
        other,
        '00000000-0000-4000-8000-000000000000',
      )

      expect(theirs.status).toBe(404)
      expect(theirs.body).toEqual(missing.body)
      expect(theirs.body.message).toBe('Product not found')
    })

    it('rejects an id that is not a UUID before querying', async () => {
      const response = await getProduct(seller, 'not-a-uuid')

      expect(response.status).toBe(400)
    })
  })

  describe('PATCH /catalogue/:productId', () => {
    let seller: Seller
    let other: Seller

    beforeAll(async () => {
      seller = await makeSeller('edit')
      other = await makeSeller('edit-other')
    })

    const patch = (
      who: Seller,
      id: string,
      fields: Record<string, unknown> = {},
      files: Upload[] = [],
    ) =>
      send(
        'patch',
        `/catalogue/${id}`,
        who.token,
        fields as Record<string, string>,
        files,
      )

    // A published product with a description and `count` images.
    const fresh = async (count = 0, overrides: Record<string, string> = {}) => {
      const files = [
        upload(jpeg()),
        upload(png()),
        upload(webp()),
        upload(jpeg()),
      ].slice(0, count)
      const response = await createProduct(
        seller,
        {
          description: 'Original description',
          quantity: '10',
          listingStatus: 'published',
          ...overrides,
        },
        files,
      )
      expect(response.status).toBe(201)
      return response.body as {
        id: string
        sku: string
        images: { id: string; path: string }[]
      }
    }

    describe('partial updates', () => {
      it('changes only what is sent, and moves updatedAt but not createdAt', async () => {
        const product = await fresh()
        const before = (await getProduct(seller, product.id)).body

        const response = await patch(seller, product.id, { price: '95.5' })

        expect(response.status).toBe(200)
        expect(response.body.price).toBe('95.50')
        for (const key of [
          'name',
          'description',
          'sku',
          'quantity',
          'lowStockThreshold',
          'listingStatus',
          'categoryId',
        ]) {
          expect(response.body[key]).toEqual(before[key])
        }
        expect(response.body.createdAt).toBe(before.createdAt)
        expect(new Date(response.body.updatedAt).getTime()).toBeGreaterThan(
          new Date(before.updatedAt).getTime(),
        )
      })

      it('does not overwrite stock that sold since the form was loaded', async () => {
        const product = await fresh()
        await dataSource.query(
          `UPDATE product SET quantity = quantity - 4 WHERE id = $1`,
          [product.id],
        )

        const response = await patch(seller, product.id, { name: 'Renamed' })

        expect(response.body.quantity).toBe(6)
        expect(response.body.name).toBe('Renamed')
      })

      it('sets stock and threshold, including to 0', async () => {
        const product = await fresh()

        const response = await patch(seller, product.id, {
          quantity: 0,
          lowStockThreshold: 5,
        })

        expect(response.body).toMatchObject({
          quantity: 0,
          lowStockThreshold: 5,
        })
      })

      it('treats an empty body as a no-op: no write, updatedAt unchanged', async () => {
        const product = await fresh()
        const before = (await getProduct(seller, product.id)).body

        const response = await patch(seller, product.id, {})

        expect(response.status).toBe(200)
        expect(response.body.updatedAt).toBe(before.updatedAt)
      })

      it.each(['brand', 'manufacturer', 'packSize', 'certification'])(
        'clears %s when it is sent blank, and leaves the others alone',
        async (field) => {
          const text = {
            brand: 'Old Brand',
            manufacturer: 'Old Maker',
            packSize: '10pk',
            certification: 'TGA',
          }
          const product = await fresh(0, text)

          const response = await patch(seller, product.id, { [field]: '  ' })

          expect(response.status).toBe(200)
          for (const [key, value] of Object.entries(text)) {
            expect(response.body[key]).toBe(key === field ? null : value)
          }
        },
      )

      it('trims optional text it keeps', async () => {
        const product = await fresh()

        const response = await patch(seller, product.id, {
          brand: '  New Brand  ',
        })

        expect(response.body.brand).toBe('New Brand')
      })

      it('moves between a top-level category and a sub-category', async () => {
        const product = await fresh()

        const toTop = await patch(seller, product.id, {
          categoryId: topCategoryId,
        })
        const toSub = await patch(seller, product.id, {
          categoryId: otherSubCategoryId,
        })

        expect(toTop.body.subCategory).toBeNull()
        expect(toTop.body.category.id).toBe(topCategoryId)
        expect(toSub.body.subCategory.id).toBe(otherSubCategoryId)
      })

      it('refuses a category that does not exist', async () => {
        const product = await fresh()

        const response = await patch(seller, product.id, {
          categoryId: '00000000-0000-4000-8000-000000000000',
        })

        expect(response.status).toBe(400)
        expect(response.body.message).toBe('Category not found')
      })

      it("keeps the images' alt text in step with the name", async () => {
        const product = await fresh(2)

        await patch(seller, product.id, { name: 'Brand New Name' })

        const images = await dbImages(product.id)
        expect(images.map((i) => i.altText)).toEqual([
          'Brand New Name',
          'Brand New Name',
        ])
      })

      it.each([
        ['a price of 0', { price: '0' }],
        ['a blank name', { name: '  ' }],
        ['negative stock', { quantity: -1 }],
        ['a retired status', { listingStatus: 'retired' }],
        ['supplierProfileId', { supplierProfileId: 'x' }],
        ['removeImageIds that are not UUIDs', { removeImageIds: ['abc'] }],
        [
          'more than 4 removeImageIds',
          {
            removeImageIds: Array.from(
              { length: 5 },
              (_, i) => `00000000-0000-4000-8000-00000000000${i}`,
            ),
          },
        ],
        [
          'repeated removeImageIds',
          {
            removeImageIds: [
              '00000000-0000-4000-8000-000000000001',
              '00000000-0000-4000-8000-000000000001',
            ],
          },
        ],
      ])('refuses %s', async (_label, fields) => {
        const product = await fresh()

        const response = await patch(seller, product.id, fields)

        expect(response.status).toBe(400)
      })
    })

    describe('SKU', () => {
      it("is a 409 when it clashes with another of this seller's, and applies none of the request", async () => {
        const first = await fresh()
        const second = await fresh()

        const response = await patch(seller, second.id, {
          sku: first.sku,
          name: 'SHOULD NOT APPLY',
          price: '1',
        })

        expect(response.status).toBe(409)
        const after = (await getProduct(seller, second.id)).body
        expect(after.name).toBe('E2E Kit')
        expect(after.price).toBe('12.50')
      })

      it('lets a product keep its own SKU, and use one another seller has', async () => {
        const mine = await fresh()
        const theirs = await createProduct(other)

        const same = await patch(seller, mine.id, { sku: mine.sku })
        const shared = await patch(seller, mine.id, { sku: theirs.body.sku })

        expect(same.status).toBe(200)
        expect(shared.status).toBe(200)
      })
    })

    describe('status', () => {
      it('Save draft unpublishes a published product, Publish publishes it again', async () => {
        const product = await fresh()

        const draft = await patch(seller, product.id, {
          listingStatus: 'draft',
        })
        const published = await patch(seller, product.id, {
          listingStatus: 'published',
        })

        expect(draft.body.listingStatus).toBe('draft')
        expect(published.body.listingStatus).toBe('published')
      })

      it('will not clear the description of a published product', async () => {
        const product = await fresh()

        const response = await patch(seller, product.id, { description: '' })

        expect(response.status).toBe(400)
        expect(response.body.message).toBe(
          'A description is required to publish',
        )
        expect((await getProduct(seller, product.id)).body.description).toBe(
          'Original description',
        )
      })

      it('judges the result: clearing the description is fine alongside a move to draft', async () => {
        const product = await fresh()

        const response = await patch(seller, product.id, {
          description: '',
          listingStatus: 'draft',
        })

        expect(response.status).toBe(200)
        expect(response.body.description).toBeNull()
      })

      it('will not publish a draft that has no description, but will with one in the same request', async () => {
        const draft = await createProduct(seller)

        const without = await patch(seller, draft.body.id, {
          listingStatus: 'published',
        })
        const withOne = await patch(seller, draft.body.id, {
          listingStatus: 'published',
          description: '  Now present  ',
        })

        expect(without.status).toBe(400)
        expect(withOne.status).toBe(200)
        expect(withOne.body).toMatchObject({
          listingStatus: 'published',
          description: 'Now present',
        })
      })
    })

    describe("retired and other sellers' products", () => {
      it('refuses to edit a retired product, even with an empty body', async () => {
        const id = await addProduct(seller, {
          name: 'Retired one',
          listingStatus: 'retired',
        })

        const edit = await patch(seller, id, { price: '5' })
        const empty = await patch(seller, id, {})

        expect(edit.status).toBe(409)
        expect(edit.body.message).toBe('Retired products cannot be edited')
        expect(empty.status).toBe(409)
        const [{ price }] = await dataSource.query(
          `SELECT price FROM product WHERE id = $1`,
          [id],
        )
        expect(price).toBe('10.00')
      })

      it("is a 404 for another seller's product and changes nothing", async () => {
        const mine = await fresh()

        const response = await patch(other, mine.id, {
          price: '1',
          name: 'Hijacked',
        })

        expect(response.status).toBe(404)
        const after = (await getProduct(seller, mine.id)).body
        expect(after.name).toBe('E2E Kit')
        expect(after.price).toBe('12.50')
      })
    })

    describe('images', () => {
      it('removes the primary: the next is promoted, order renumbered, and the file deleted', async () => {
        const product = await fresh(3)
        const [first, second, third] = product.images

        const response = await patch(seller, product.id, {
          removeImageIds: [first.id],
        })

        expect(response.status).toBe(200)
        expect(
          response.body.images.map(
            (i: { id: string; sortOrder: number; isPrimary: boolean }) => [
              i.id,
              i.sortOrder,
              i.isPrimary,
            ],
          ),
        ).toEqual([
          [second.id, 0, true],
          [third.id, 1, false],
        ])
        expect(await fileExists(first.path)).toBe(false)
        expect(await fileExists(second.path)).toBe(true)
      })

      it('adds images after the kept ones, up to 4 in all', async () => {
        const product = await fresh(2)

        const response = await patch(seller, product.id, {}, [
          upload(jpeg()),
          upload(png()),
        ])

        expect(response.status).toBe(200)
        expect(response.body.images).toHaveLength(4)
        expect(response.body.images[0].id).toBe(product.images[0].id)
        expect(
          response.body.images.map((i: { sortOrder: number }) => i.sortOrder),
        ).toEqual([0, 1, 2, 3])
        expect(
          response.body.images.filter(
            (i: { isPrimary: boolean }) => i.isPrimary,
          ),
        ).toHaveLength(1)
      })

      it('refuses a fifth image without writing a file', async () => {
        const product = await fresh(4)
        const before = await filesOnDisk()

        const response = await patch(seller, product.id, {}, [upload(jpeg())])

        expect(response.status).toBe(400)
        expect(response.body.message).toBe(
          'A product can have at most 4 images',
        )
        expect(await filesOnDisk()).toEqual(before)
      })

      it('removes one and adds one in a single request (multipart, a single removeImageIds value)', async () => {
        const product = await fresh(4)

        const response = await patch(
          seller,
          product.id,
          { removeImageIds: product.images[0].id },
          [upload(webp())],
        )

        expect(response.status).toBe(200)
        expect(response.body.images).toHaveLength(4)
        expect(response.body.images[0].id).toBe(product.images[1].id)
        expect(response.body.images[0].isPrimary).toBe(true)
        expect(await fileExists(product.images[0].path)).toBe(false)
      })

      it('can remove every image, and the next one added becomes primary', async () => {
        const product = await fresh(2)

        const emptied = await patch(seller, product.id, {
          removeImageIds: product.images.map((i) => i.id),
        })
        const added = await patch(seller, product.id, {}, [upload(jpeg())])

        expect(emptied.body.images).toEqual([])
        expect(added.body.images[0]).toMatchObject({
          sortOrder: 0,
          isPrimary: true,
        })
      })

      it("refuses an id that is not one of this product's images, and deletes nothing", async () => {
        const product = await fresh(1)
        const stranger = await fresh(1)

        const gone = await patch(seller, product.id, {
          removeImageIds: ['00000000-0000-4000-8000-000000000000'],
        })
        const foreign = await patch(seller, product.id, {
          removeImageIds: [stranger.images[0].id],
        })

        expect(gone.status).toBe(400)
        expect(foreign.status).toBe(400)
        expect(foreign.body.message).toBe(
          'One of the images to remove does not belong to this product',
        )
        expect(await dbImages(stranger.id)).toHaveLength(1)
        expect(await fileExists(stranger.images[0].path)).toBe(true)
      })

      it('applies nothing, and writes no file, when an added file is not an image', async () => {
        const product = await fresh(1)
        const before = await filesOnDisk()

        const response = await patch(seller, product.id, { price: '7' }, [
          upload(notAnImage(), 'x.jpg'),
        ])

        expect(response.status).toBe(400)
        expect((await getProduct(seller, product.id)).body.price).toBe('12.50')
        expect(await filesOnDisk()).toEqual(before)
      })

      it('removes the new files again when the same request fails on the SKU', async () => {
        const first = await fresh()
        const second = await fresh(1)
        const before = await filesOnDisk()

        const response = await patch(seller, second.id, { sku: first.sku }, [
          upload(jpeg()),
          upload(png()),
        ])

        expect(response.status).toBe(409)
        expect(await filesOnDisk()).toEqual(before)
        expect(await dbImages(second.id)).toHaveLength(1)
      })

      it('refuses a request whose removals leave no room for the additions, touching nothing', async () => {
        const product = await fresh(3)

        const response = await patch(
          seller,
          product.id,
          { removeImageIds: [product.images[0].id] },
          [upload(jpeg()), upload(jpeg()), upload(jpeg())],
        )

        // 2 kept + 3 new is 5: refused before anything is touched.
        expect(response.status).toBe(400)
        expect(await dbImages(product.id)).toHaveLength(3)
        for (const image of product.images)
          expect(await fileExists(image.path)).toBe(true)
      })
    })

    describe('concurrency', () => {
      it('never lets simultaneous uploads push a product past 4 images', async () => {
        const product = await fresh(3)

        const results = await Promise.all(
          [1, 2, 3, 4].map(() =>
            patch(seller, product.id, {}, [upload(jpeg())]),
          ),
        )

        expect(results.map((r) => r.status).sort()).toEqual([
          200, 400, 400, 400,
        ])
        const images = await dbImages(product.id)
        expect(images).toHaveLength(4)
        expect(images.filter((i) => i.isPrimary)).toHaveLength(1)
        for (const image of images)
          expect(await fileExists(image.path)).toBe(true)
      })

      it('lets simultaneous stock edits all succeed, one after another', async () => {
        const product = await fresh()

        const results = await Promise.all(
          [1, 2, 3, 4, 5].map((quantity) =>
            patch(seller, product.id, { quantity }),
          ),
        )

        expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200, 200])
      })
    })

    it('shows the edit in the catalogue table', async () => {
      const product = await fresh(0, { name: 'Table Check' })
      await patch(seller, product.id, { price: '77.7', quantity: 3 })

      const response = await http()
        .get(`${base}/catalogue`)
        .query({ search: 'Table Check' })
        .set(auth(seller.token))

      expect(response.body.data[0]).toMatchObject({
        price: '77.70',
        quantity: 3,
      })
    })
  })

  describe('POST /catalogue/:productId/retire', () => {
    let seller: Seller
    let other: Seller
    let buyerId: string
    const createdOrderNumbers: string[] = []
    const createdCarriers: string[] = []
    let orderCount = 0

    beforeAll(async () => {
      seller = await makeSeller('retire')
      other = await makeSeller('retire-other')
      buyerId = (
        await dataSource.query(
          `SELECT id FROM "user" WHERE email = 'j.shaw@saclinics.com.au'`,
        )
      )[0].id
    })

    afterAll(async () => {
      // Orders reference the products, so they go before the outer cleanup removes those.
      const orders = `SELECT id FROM "order" WHERE order_number = ANY($1)`
      for (const table of ['payment', 'delivery', 'order_item']) {
        await dataSource.query(
          `DELETE FROM ${table} WHERE order_id IN (${orders})`,
          [createdOrderNumbers],
        )
      }
      await dataSource.query(
        `DELETE FROM "order" WHERE order_number = ANY($1)`,
        [createdOrderNumbers],
      )
      await dataSource.query(`DELETE FROM carrier WHERE name = ANY($1)`, [
        createdCarriers,
      ])
    })

    const retire = (
      who: Seller,
      id: string,
      body: Record<string, unknown> = {},
    ) =>
      http()
        .post(`${base}/catalogue/${id}/retire`)
        .set(auth(who.token))
        .send(body)

    // A published product with a description and `count` images.
    const published = async (
      count = 0,
      overrides: Record<string, string> = {},
    ) => {
      const files = [upload(jpeg()), upload(png())].slice(0, count)
      const response = await createProduct(
        seller,
        {
          description: 'A description',
          quantity: '10',
          listingStatus: 'published',
          ...overrides,
        },
        files,
      )
      expect(response.status).toBe(201)
      return response.body as {
        id: string
        sku: string
        images: { id: string; path: string }[]
      }
    }

    // An order of `quantity` units of the product, awaiting dispatch, with a paid payment.
    const orderFor = async (productId: string, owner: Seller, quantity = 3) => {
      orderCount += 1
      const orderNumber = `ORD-2098-${(run % 80000) + 10000 + orderCount}`
      createdOrderNumbers.push(orderNumber)
      const [{ id: orderId }] = await dataSource.query(
        `INSERT INTO "order" (order_number, user_id, supplier_profile_id, status, subtotal,
                              gst_total, total, placed_at)
         VALUES ($1, $2, $3, 'placed', 9.00, 1.00, 10.00, now()) RETURNING id`,
        [orderNumber, buyerId, owner.profileId],
      )
      await dataSource.query(
        `INSERT INTO order_item (order_id, product_id, product_name, sku, quantity,
                                 unit_price_at_purchase, line_total)
         VALUES ($1, $2, 'E2E retired line', 'E2E-RETIRE', $3::int, 1.00, $3::int)`,
        [orderId, productId, quantity],
      )
      await dataSource.query(
        `INSERT INTO delivery (order_id, street_address, suburb, state, postcode)
         VALUES ($1, '1 Test St', 'Parramatta', 'NSW', '2150')`,
        [orderId],
      )
      await dataSource.query(
        `INSERT INTO payment (order_id, method, status, amount) VALUES ($1, 'card_mock', 'paid', 10.00)`,
        [orderId],
      )
      return { orderNumber, orderId }
    }

    describe('retiring', () => {
      it('takes a published product off sale and returns it, everything else as it was', async () => {
        const product = await published(2)
        const before = (await getProduct(seller, product.id)).body

        const response = await retire(seller, product.id)

        expect(response.status).toBe(200)
        expect(response.body.listingStatus).toBe('retired')
        for (const key of [
          'name',
          'description',
          'sku',
          'price',
          'quantity',
          'lowStockThreshold',
          'categoryId',
          'createdAt',
        ]) {
          expect(response.body[key]).toEqual(before[key])
        }
        expect(response.body.images).toEqual(before.images)
        expect(new Date(response.body.updatedAt).getTime()).toBeGreaterThan(
          new Date(before.updatedAt).getTime(),
        )
        const [row] = await dataSource.query(
          `SELECT listing_status AS status FROM product WHERE id = $1`,
          [product.id],
        )
        expect(row.status).toBe('retired')
      })

      it('retires a draft too, such as one that was never finished', async () => {
        const draft = await createProduct(seller)

        const response = await retire(seller, draft.body.id)

        expect(response.status).toBe(200)
        expect(response.body.listingStatus).toBe('retired')
      })

      it('keeps the images, files and stock: nothing is deleted', async () => {
        const product = await published(2)

        await retire(seller, product.id)

        expect(await dbImages(product.id)).toHaveLength(2)
        for (const image of product.images)
          expect(await fileExists(image.path)).toBe(true)
        const [{ quantity }] = await dataSource.query(
          `SELECT quantity FROM product WHERE id = $1`,
          [product.id],
        )
        expect(quantity).toBe(10)
      })

      it('stays readable, and moves from Published to Retired in the table', async () => {
        const product = await published(0, { name: 'Retire Table Check' })
        const search = { search: 'Retire Table Check' }
        const table = (status?: string) =>
          http()
            .get(`${base}/catalogue`)
            .query(status ? { ...search, status } : search)
            .set(auth(seller.token))

        expect((await table('published')).body.data).toHaveLength(1)

        await retire(seller, product.id)

        expect((await getProduct(seller, product.id)).body.listingStatus).toBe(
          'retired',
        )
        expect((await table('published')).body.data).toHaveLength(0)
        expect(
          (await table('retired')).body.data.map((p: { id: string }) => p.id),
        ).toEqual([product.id])
        expect(
          (await table()).body.data.map((p: { id: string }) => p.id),
        ).toEqual([product.id])
      })

      it('keeps the SKU reserved, so it cannot be used for another product', async () => {
        const product = await published()

        await retire(seller, product.id)
        const again = await createProduct(seller, { sku: product.sku })

        expect(again.status).toBe(409)
        expect(again.body.message).toBe(
          'You already have a product with this SKU',
        )
      })

      it('ignores a body: a status in it cannot undo or change the retire', async () => {
        const product = await published()

        const response = await retire(seller, product.id, {
          listingStatus: 'published',
          price: '1',
        })

        expect(response.status).toBe(200)
        expect(response.body.listingStatus).toBe('retired')
        expect(response.body.price).toBe('12.50')
      })
    })

    describe('once retired', () => {
      it('cannot be edited or published again: Phase 1 retiring is final', async () => {
        const product = await published()
        await retire(seller, product.id)

        const edit = await send(
          'patch',
          `/catalogue/${product.id}`,
          seller.token,
          { price: '5' },
        )
        const empty = await send(
          'patch',
          `/catalogue/${product.id}`,
          seller.token,
          {},
        )
        const publish = await send(
          'patch',
          `/catalogue/${product.id}`,
          seller.token,
          { listingStatus: 'published' },
        )

        expect([edit.status, empty.status, publish.status]).toEqual([
          409, 409, 409,
        ])
        expect(edit.body.message).toBe('Retired products cannot be edited')
        expect((await getProduct(seller, product.id)).body).toMatchObject({
          listingStatus: 'retired',
          price: '12.50',
        })
      })

      it('refuses a second retire with 409, and one that was already retired', async () => {
        const product = await published()
        const first = await retire(seller, product.id)
        const second = await retire(seller, product.id)
        const seededRetired = await addProduct(seller, {
          name: 'Long gone',
          listingStatus: 'retired',
        })
        const third = await retire(seller, seededRetired)

        expect(first.status).toBe(200)
        expect(second.status).toBe(409)
        expect(second.body.message).toBe('This product is already retired')
        expect(third.status).toBe(409)
        expect((await getProduct(seller, product.id)).body.listingStatus).toBe(
          'retired',
        )
      })
    })

    describe('who may retire what', () => {
      it("is a 404 for another seller's product, identical to a missing one, and changes nothing", async () => {
        const mine = await published()

        const theirs = await retire(other, mine.id)
        const missing = await retire(
          other,
          '00000000-0000-4000-8000-000000000000',
        )

        expect(theirs.status).toBe(404)
        expect(theirs.body).toEqual(missing.body)
        expect(theirs.body.message).toBe('Product not found')
        expect((await getProduct(seller, mine.id)).body.listingStatus).toBe(
          'published',
        )
      })

      it('rejects an id that is not a UUID', async () => {
        const response = await http()
          .post(`${base}/catalogue/not-a-uuid/retire`)
          .set(auth(seller.token))

        expect(response.status).toBe(400)
      })
    })

    describe('what it stops counting', () => {
      it('drops a retired product from the dashboard counts and the low-stock banner', async () => {
        const counter = await makeSeller('retire-counts')
        const low = await addProduct(counter, {
          name: 'Nearly out',
          quantity: 0,
          lowStockThreshold: 5,
        })
        await addProduct(counter, {
          name: 'Plenty',
          quantity: 50,
          lowStockThreshold: 5,
        })
        const overview = async () =>
          (
            await http()
              .get(`${base}/dashboard/overview`)
              .set(auth(counter.token))
          ).body
        const banner = async () =>
          (await http().get(`${base}/catalogue`).set(auth(counter.token))).body
            .lowStock

        expect(await overview()).toMatchObject({
          activeListings: 2,
          listingsNeedingAttention: 1,
        })
        expect(await banner()).toHaveLength(1)

        const response = await retire(counter, low)

        expect(response.status).toBe(200)
        expect(await overview()).toMatchObject({
          activeListings: 1,
          listingsNeedingAttention: 0,
        })
        expect(await banner()).toEqual([])
      })

      it('leaves the counts alone when a draft is retired: it never counted', async () => {
        const counter = await makeSeller('retire-draft-counts')
        await addProduct(counter, {
          name: 'Live',
          quantity: 50,
          lowStockThreshold: 5,
        })
        const draft = await addProduct(counter, {
          name: 'Unfinished',
          quantity: 0,
          lowStockThreshold: 5,
          listingStatus: 'draft',
        })

        await retire(counter, draft)

        const overview = (
          await http()
            .get(`${base}/dashboard/overview`)
            .set(auth(counter.token))
        ).body
        expect(overview).toMatchObject({
          activeListings: 1,
          listingsNeedingAttention: 0,
        })
      })
    })

    describe('orders already placed', () => {
      it('can still be dispatched after the product is retired', async () => {
        const product = await published(0, { quantity: '100' })
        const order = await orderFor(product.id, seller)
        await retire(seller, product.id)
        const carrier = `E2E Retire Carrier ${run}`
        createdCarriers.push(carrier)

        const dispatch = await http()
          .post(`${base}/orders/${order.orderNumber}/dispatch`)
          .set(auth(seller.token))
          .send({ carrierName: carrier, trackingNumber: 'T-1' })

        expect(dispatch.status).toBe(200)
        expect(dispatch.body.status).toBe('dispatched')
        expect(dispatch.body.items).toHaveLength(1)
      })

      it('can still be cancelled, and the units go back to the retired product', async () => {
        const product = await published(0, { quantity: '100' })
        const order = await orderFor(product.id, seller, 4)
        await retire(seller, product.id)

        const cancel = await http()
          .post(`${base}/orders/${order.orderNumber}/cancel`)
          .set(auth(seller.token))
          .send({ reason: 'out_of_stock' })

        expect(cancel.status).toBe(200)
        const [{ quantity, status }] = await dataSource.query(
          `SELECT quantity, listing_status AS status FROM product WHERE id = $1`,
          [product.id],
        )
        expect(quantity).toBe(104)
        expect(status).toBe('retired')
      })

      it('keeps the order lines: retiring never rewrites history', async () => {
        const product = await published()
        const order = await orderFor(product.id, seller, 2)

        await retire(seller, product.id)

        const detail = await http()
          .get(`${base}/orders/${order.orderNumber}`)
          .set(auth(seller.token))
        expect(detail.body.items).toEqual([
          { productName: 'E2E retired line', sku: 'E2E-RETIRE', quantity: 2 },
        ])
      })
    })

    describe('concurrency', () => {
      it('lets exactly one of several simultaneous retires win', async () => {
        const product = await published()

        const results = await Promise.all(
          [1, 2, 3, 4].map(() => retire(seller, product.id)),
        )

        expect(results.map((r) => r.status).sort()).toEqual([
          200, 409, 409, 409,
        ])
        expect((await getProduct(seller, product.id)).body.listingStatus).toBe(
          'retired',
        )
      })

      it('always ends retired when a retire races an edit, and never loses either decision', async () => {
        for (let round = 0; round < 6; round++) {
          const product = await published()

          const [retired, edited] = await Promise.all([
            retire(seller, product.id),
            send('patch', `/catalogue/${product.id}`, seller.token, {
              price: '77',
            }),
          ])

          const after = (await getProduct(seller, product.id)).body
          expect(retired.status).toBe(200)
          expect([200, 409]).toContain(edited.status)
          expect(after.listingStatus).toBe('retired')
          // The edit either landed before the retire, or was refused: never half done.
          expect(after.price).toBe(edited.status === 200 ? '77.00' : '12.50')
        }
      })
    })
  })
})
