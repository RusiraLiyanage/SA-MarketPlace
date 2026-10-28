// Must be set before the app is built: AuthCoreModule reads it at startup.
process.env.AUTH_THROTTLE_LIMIT = '3'
process.env.AUTH_THROTTLE_TTL = '60'

import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AllExceptionsFilter } from '@sa-marketplace/common'
import * as request from 'supertest'
import { API_PREFIX } from '../src/app.constant'
import { AppModule } from '../src/app.module'
import { AppValidationPipe } from '../src/app.pipe'

// Requires the local database: pnpm db:up, pnpm db:seed
// Its own file, because the limit is per process and the other suite needs headroom.
describe('Auth rate limit (e2e)', () => {
  let app: INestApplication

  const base = '/api/customer/v1/auth'
  const limit = 3

  const login = (password: string) =>
    request(app.getHttpServer())
      .post(`${base}/login`)
      .send({ email: 'j.shaw@saclinics.com.au', password })

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
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

  it('allows the first attempts, then blocks with 429', async () => {
    const statuses: number[] = []
    for (let attempt = 0; attempt < limit + 2; attempt++) {
      statuses.push((await login('WrongPassword1!')).status)
    }

    expect(statuses.slice(0, limit)).toEqual(Array(limit).fill(401))
    expect(statuses.slice(limit)).toEqual([429, 429])
  })

  it('answers with the rate-limit error code, not a generic one', async () => {
    const response = await login('WrongPassword1!')

    expect(response.status).toBe(429)
    expect(response.body.error).toBe('ECB429')
  })

  it('blocks the right password too, so guessing cannot be confirmed', async () => {
    const response = await login('Password123!')

    expect(response.status).toBe(429)
  })

  it('leaves unthrottled routes alone', async () => {
    const response = await request(app.getHttpServer()).get(`${base}/profile`)

    // 401 for no token, not 429: the limit is on login and register only.
    expect(response.status).toBe(401)
  })
})
