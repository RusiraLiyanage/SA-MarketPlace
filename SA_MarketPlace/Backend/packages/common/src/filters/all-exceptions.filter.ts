import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Response } from 'express'
import {
  AppError,
  BusinessException,
  getAppErrorForStatus,
  getStatusForAppError,
} from '../configs/app.exception'
import { TBaseDto } from '../configs/app.type'

/** Sent to the client for anything unhandled — never the real message or stack (§7). */
const INTERNAL_ERROR_MESSAGE = 'Internal server error'

type ErrorBody = TBaseDto<Record<string, never>>

/** Non-Nest error (e.g. body-parser) with its own status; `expose: true` marks the message client-safe. */
type ExposedClientError = Error & { status: number; expose: true }

const isExposedClientError = (
  exception: unknown,
): exception is ExposedClientError => {
  if (!(exception instanceof Error)) {
    return false
  }
  const { status, expose } = exception as Partial<ExposedClientError>
  return (
    expose === true &&
    typeof status === 'number' &&
    status >= HttpStatus.BAD_REQUEST &&
    status < HttpStatus.INTERNAL_SERVER_ERROR
  )
}

/** Renders every unhandled exception as the standard envelope with a truthful HTTP status. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>()
    const { status, body } = this.render(exception)

    this.log(status, exception)
    response.status(status).json(body)
  }

  private render(exception: unknown): { status: HttpStatus; body: ErrorBody } {
    if (exception instanceof BusinessException) {
      return {
        status: getStatusForAppError(exception.error),
        body: { data: {}, error: exception.error, message: exception.message },
      }
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      return {
        status,
        body: {
          data: {},
          error: getAppErrorForStatus(status),
          message: this.extractMessage(exception),
        },
      }
    }

    // Only 4xx marked safe to expose. Server-side errors never reach the client.
    if (isExposedClientError(exception)) {
      return {
        status: exception.status,
        body: {
          data: {},
          error: getAppErrorForStatus(exception.status),
          message: exception.message,
        },
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        data: {},
        error: AppError.ECI500,
        message: INTERNAL_ERROR_MESSAGE,
      },
    }
  }

  /** Flattens ValidationPipe's `{ message: string[] }` into one line. */
  private extractMessage(exception: HttpException): string {
    const payload = exception.getResponse()

    if (typeof payload === 'string') {
      return payload
    }

    const message = (payload as { message?: string | string[] }).message

    if (Array.isArray(message)) {
      return message.join('; ')
    }

    return message ?? exception.message
  }

  private log(status: HttpStatus, exception: unknown): void {
    const description =
      exception instanceof Error ? exception.message : String(exception)

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        description,
        exception instanceof Error ? exception.stack : undefined,
      )
      return
    }

    this.logger.warn(description)
  }
}
