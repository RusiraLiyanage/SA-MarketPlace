import { ApiProperty } from '@nestjs/swagger'
import { PATTERNS } from '@sa-marketplace/common'
import { Transform } from 'class-transformer'
import {
  Equals,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator'

export class RegisterDto {
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

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string

  // Organisation name; matched to an existing one, or created.
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  organisation!: string

  // Raw value, so implicit conversion can't turn the string "false" into true.
  @Transform(({ obj }) => obj.acceptTerms)
  @Equals(true, { message: 'you must accept the terms to register' })
  acceptTerms!: boolean
}
