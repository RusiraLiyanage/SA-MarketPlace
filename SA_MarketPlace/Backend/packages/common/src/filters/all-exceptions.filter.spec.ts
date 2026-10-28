import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { AppError, BusinessException } from '../configs/app.exception'
import { AllExceptionsFilter } from './all-exceptions.filter'

const createHost = () => {
  const json = jest.fn()
  const status = jest.fn().mockReturnValue({ json })
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost
  return { host, status, json }
}

const render = (exception: unknown) => {
  const { host, status, json } = createHost()
  new AllExceptionsFilter().catch(exception, host)
  return { status: status.mock.calls[0][0], body: json.mock.calls[0][0] }
}

describe('AllExceptionsFilter', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation()
    jest.spyOn(Logger.prototype, 'error').mockImplementation()
  })

  afterAll(() => jest.restoreAllMocks())

  it('maps a BusinessException code to its status', () => {
    const { status, body } = render(
      new BusinessException(AppError.ECB409, 'Email already registered'),
    )

    expect(status).toBe(HttpStatus.CONFLICT)
    expect(body).toEqual({
      data: {},
      error: AppError.ECB409,
      message: 'Email already registered',
    })
  })

  it('keeps the status of a Nest HttpException', () => {
    const { status, body } = render(new NotFoundException('No such product'))

    expect(status).toBe(HttpStatus.NOT_FOUND)
    expect(body.error).toBe(AppError.ECB404)
    expect(body.message).toBe('No such product')
  })

  it('flattens ValidationPipe message arrays into one line', () => {
    const { body } = render(
      new BadRequestException(['email must be an email', 'name is required']),
    )

    expect(body.message).toBe('email must be an email; name is required')
  })

  it('keeps the status of an exposed client error from Express middleware', () => {
    // The shape body-parser raises for a body over the size limit.
    const tooLarge = Object.assign(new Error('request entity too large'), {
      status: 413,
      statusCode: 413,
      expose: true,
      type: 'entity.too.large',
    })

    const { status, body } = render(tooLarge)

    expect(status).toBe(413)
    expect(body.message).toBe('request entity too large')
  })

  it('never exposes a server error, even one carrying a status', () => {
    const leaky = Object.assign(
      new Error('connection refused: db-password=x'),
      {
        status: 503,
        expose: false,
      },
    )

    const { status, body } = render(leaky)

    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR)
    expect(body).toEqual({
      data: {},
      error: AppError.ECI500,
      message: 'Internal server error',
    })
  })

  it('does not trust a 4xx status unless expose is true', () => {
    const unmarked = Object.assign(new Error('internal detail'), {
      status: 400,
    })

    const { status, body } = render(unmarked)

    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR)
    expect(body.message).toBe('Internal server error')
  })

  it('renders anything unknown as a generic 500', () => {
    const { status, body } = render('something odd was thrown')

    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR)
    expect(body.error).toBe(AppError.ECI500)
  })
})
