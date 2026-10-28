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
describe('Admin auth rate limit (e2e)', () => {
  let app: INestApplication

  const base = '/api/admin/v1/auth'
  const limit = 3

  const login = (password: string) =>
    request(app.getHttpServer())
      .post(`${base}/login`)
      .send({ email: 'a.morgan@sampleassist.com.au', password })

  // Sends `limit + 2` identical requests and returns every status.
  const hammer = async (path: string, body: object): Promise<number[]> => {
    const statuses: number[] = []
    for (let attempt = 0; attempt < limit + 2; attempt++) {
      statuses.push(
        (await request(app.getHttpServer()).post(`${base}/${path}`).send(body))
          .status,
      )
    }
    return statuses
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
  })

  afterAll(async () => {
    await app.close()
  })

  it('allows the first login attempts, then blocks with 429', async () => {
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

  it('also limits register, before validation runs', async () => {
    // An empty body is invalid (400), so any 429 proves the guard ran first.
    const statuses = await hammer('register', {})

    expect(statuses.slice(0, limit)).toEqual(Array(limit).fill(400))
    expect(statuses.slice(limit)).toEqual([429, 429])
  })

  it('also limits forgot-password and reset-password', async () => {
    const forgot = await hammer('forgot-password', {
      email: `nobody@example.com`,
    })
    const reset = await hammer('reset-password', {
      token: 'not-a-token',
      password: 'Whatever9!',
    })

    expect(forgot.slice(0, limit)).toEqual(Array(limit).fill(200))
    expect(forgot.slice(limit)).toEqual([429, 429])
    expect(reset.slice(0, limit)).toEqual(Array(limit).fill(400))
    expect(reset.slice(limit)).toEqual([429, 429])
  })

  it('also limits change-password, before the token is even checked', async () => {
    // No token is 401, so any 429 proves the throttle guard ran first.
    const statuses = await hammer('change-password', {
      newPassword: 'Whatever9!',
    })

    expect(statuses.slice(0, limit)).toEqual(Array(limit).fill(401))
    expect(statuses.slice(limit)).toEqual([429, 429])
  })

  it('leaves unthrottled routes alone', async () => {
    const response = await request(app.getHttpServer()).post(`${base}/logout`)

    // 401 for no token, not 429: the limit is on the credential routes only.
    expect(response.status).toBe(401)
  })
})
