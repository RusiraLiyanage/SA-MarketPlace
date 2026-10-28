import { ValidationPipe, ValidationPipeOptions } from '@nestjs/common'

/** Global validation: unknown fields are rejected, and DTO property types drive conversion. */
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
