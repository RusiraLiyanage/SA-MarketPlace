import {
  Body,
  Controller,
  Get,
  INestApplication,
  Patch,
  Post,
  Put,
  Query,
  VersioningType,
} from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AllExceptionsFilter } from '@sa-marketplace/common'
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator'
import * as request from 'supertest'
import { DataSource } from 'typeorm'
import { API_PREFIX } from '../src/app.constant'
import { AppModule } from '../src/app.module'
import { AppValidationPipe } from '../src/app.pipe'

/** Test-only route that returns the body it received, after middleware has run. */
@Controller({ path: 'echo', version: '1' })
class EchoController {
  @Post()
  post(@Body() body: unknown) {
    return body
  }

  @Put()
  put(@Body() body: unknown) {
    return body
  }

  @Patch()
  patch(@Body() body: unknown) {
    return body
  }
}

class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsInt()
  @Min(1)
  quantity!: number
}

class ListItemsQuery {
  @IsOptional()
  @IsInt()
  page?: number

  @IsOptional()
  @IsString()
  postcode?: string
}

/** Test-only routes with DTOs, so the global validation pipe has something to check. */
@Controller({ path: 'items', version: '1' })
class ItemsController {
  @Post()
  create(@Body() body: CreateItemDto) {
    return body
  }

  @Get()
  list(@Query() query: ListItemsQuery) {
    return {
      page: query.page,
      pageType: typeof query.page,
      postcode: query.postcode,
      postcodeType: typeof query.postcode,
    }
  }
}

// Requires the local database: pnpm db:up
describe('AppModule (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [EchoController, ItemsController],
    }).compile()

    app = moduleRef.createNestApplication()
    // Same global setup as main.ts.
    app.enableVersioning({ type: VersioningType.URI, prefix: API_PREFIX })
    app.useGlobalPipes(new AppValidationPipe())
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()
    // Bound to loopback, not supertest's wildcard: a random wildcard port can collide with
    // a server another program holds on 127.0.0.1, which then answers with an empty 404.
    await app.listen(0, '127.0.0.1')
  })

  afterAll(async () => {
    await app.close()
  })

  it('connects to the database', async () => {
    const dataSource = app.get(DataSource)
    const [row] = await dataSource.query('SELECT current_database() AS name')

    expect(dataSource.isInitialized).toBe(true)
    expect(row.name).toBe('sa_marketplace')
  })

  it('loads every entity', () => {
    // Same count as every other app — one shared ALL_ENTITIES list (CLAUDE.md §1).
    expect(app.get(DataSource).entityMetadatas).toHaveLength(17)
  })

  it.each(['post', 'put', 'patch'] as const)(
    'strips script tags from %s bodies',
    async (method) => {
      const response = await request(app.getHttpServer())
        [method]('/api/admin/v1/echo')
        .send({
          name: '<script>alert(1)</script>Bob',
          nested: { note: '<script>steal()</script>ok' },
        })

      expect(response.status).toBeLessThan(300)
      expect(response.body).toEqual({ name: 'Bob', nested: { note: 'ok' } })
    },
  )

  describe('validation pipe', () => {
    const items = '/api/admin/v1/items'

    it('accepts a valid body', async () => {
      const response = await request(app.getHttpServer())
        .post(items)
        .send({ name: 'Gloves', quantity: 2 })

      expect(response.status).toBe(201)
      expect(response.body).toEqual({ name: 'Gloves', quantity: 2 })
    })

    it('rejects a field the DTO does not declare', async () => {
      const response = await request(app.getHttpServer())
        .post(items)
        .send({ name: 'Gloves', quantity: 2, role: 'admin' })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('ECB001')
      expect(response.body.message).toContain('property role should not exist')
    })

    it('reports every invalid field in one message', async () => {
      const response = await request(app.getHttpServer())
        .post(items)
        .send({ name: '', quantity: 0 })

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('name should not be empty')
      expect(response.body.message).toContain(
        'quantity must not be less than 1',
      )
      expect(response.body.message).toContain('; ')
    })

    it('converts query values using the DTO property type', async () => {
      const response = await request(app.getHttpServer()).get(
        `${items}?page=5&postcode=0800`,
      )

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        page: 5,
        pageType: 'number',
        // A string field keeps its leading zero.
        postcode: '0800',
        postcodeType: 'string',
      })
    })
  })
})
