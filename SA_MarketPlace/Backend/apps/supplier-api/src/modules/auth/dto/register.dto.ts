import { ApiProperty } from '@nestjs/swagger'
import { IsAbn, IsContactName, PATTERNS } from '@sa-marketplace/common'
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

// No confirmPassword (client-side), no firstName/lastName (one "Contact name", split in the service).
// "Role / title" and "Product categories" are not collected: no backing column in the data model.
export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  businessName!: string

  @IsAbn()
  abn!: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessType?: string

  // At least two words: the service splits this into first and last name,
  // and User.lastName cannot be empty.
  @IsContactName()
  contactName!: string

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
  @MaxLength(32)
  phone!: string

  // Accuracy checkbox. Raw value, so implicit conversion can't turn the string "false" into true.
  @Transform(({ obj }) => obj.confirmAuthorised)
  @Equals(true, {
    message: 'you must confirm you are authorised to register this business',
  })
  confirmAuthorised!: boolean
}
