import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'

// PATCH /auth/profile — partial update, only these three fields (§ README
// "My Profile"). Never email, password or organisation: see ADR 0028.
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName?: string

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName?: string

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phone?: string
}
