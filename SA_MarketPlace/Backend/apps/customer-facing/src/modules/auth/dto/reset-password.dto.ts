import { ApiProperty } from '@nestjs/swagger'
import { PATTERNS } from '@sa-marketplace/common'
import { IsNotEmpty, IsString, Matches } from 'class-validator'

export class ResetPasswordDto {
  // Explicit so Swagger always prefills the body instead of showing {}.
  @ApiProperty({
    example: 'c0ffee5e-0000-4000-8000-resettoken01',
    description: 'The token from the reset link in the email.',
  })
  @IsString()
  @IsNotEmpty()
  token!: string

  // Same rule as registration (RegisterDto).
  @ApiProperty({
    example: 'NewPassw0rd!2026',
    description:
      'The new password: at least 8 characters with an uppercase letter, a lowercase letter, a number and a symbol.',
  })
  @Matches(PATTERNS.PASSWORD, {
    message:
      'password must be at least 8 characters with an uppercase letter, a lowercase letter, a number and a symbol',
  })
  password!: string
}
