import { ApiProperty } from '@nestjs/swagger'
import { IsContactName, PATTERNS } from '@sa-marketplace/common'
import { Transform } from 'class-transformer'
import { Equals, IsEmail, Matches, MaxLength } from 'class-validator'

// Limited to allowed email domains (ADR 0038). No confirmPassword (client-side), no firstName/lastName
// (one "Full name", split in the service).
export class RegisterDto {
  // At least two words: the service splits this into first and last name,
  // and User.lastName cannot be empty.
  @IsContactName()
  fullName!: string

  @IsEmail()
  @MaxLength(255)
  email!: string

  // Explicit so Swagger always lists the field.
  @ApiProperty({
    example: 'Passw0rd!2026',
    description:
      'At least 8 characters with an uppercase letter, a lowercase letter, a number and a symbol.',
  })
  @Matches(PATTERNS.PASSWORD, {
    message:
      'password must be at least 8 characters with an uppercase letter, a lowercase letter, a number and a symbol',
  })
  password!: string

  // Raw value, so implicit conversion can't turn the string "false" into true.
  // Stored as user.terms_accepted_at, as the customer sign-up does.
  @Transform(({ obj }) => obj.acceptTerms)
  @Equals(true, { message: 'you must accept the terms to register' })
  acceptTerms!: boolean
}
