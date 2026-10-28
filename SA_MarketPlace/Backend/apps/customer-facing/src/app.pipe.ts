import { ValidationPipe, ValidationPipeOptions } from '@nestjs/common'

/** Global request validation: unknown fields are rejected, DTO types drive conversion. */
export class AppValidationPipe extends ValidationPipe {
  constructor(options: ValidationPipeOptions = {}) {
    super({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
      ...options,
    })
  }
}
