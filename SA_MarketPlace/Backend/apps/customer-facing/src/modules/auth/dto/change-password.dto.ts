import { ApiProperty } from '@nestjs/swagger'
import { PATTERNS } from '@sa-marketplace/common'
import { Matches } from 'class-validator'

// No currentPassword (the JWT is the proof, ADR 0030) and no confirmPassword (client-side).
export class ChangePasswordDto {
  // Explicit so Swagger always prefills the body instead of showing {}.
  @ApiProperty({
    example: 'NewPassw0rd!2026',
    description:
      'At least 8 characters with an uppercase letter, a lowercase letter, a number and a symbol.',
  })
  @Matches(PATTERNS.PASSWORD, {
    message:
      'password must be at least 8 characters with an uppercase letter, a lowercase letter, a number and a symbol',
  })
  newPassword!: string
}
