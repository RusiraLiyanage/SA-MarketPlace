import { IsContactName, trim } from '@sa-marketplace/common'
import { Transform } from 'class-transformer'
import { IsOptional } from 'class-validator'

// PATCH /auth/profile: partial, so only what is sent changes. Only the name: never email, role
// or password (ADR 0028), which the validation pipe rejects as unknown fields.
export class UpdateProfileDto {
  // At least two words: the service splits it into first and last name (ADR 0031).
  @Transform(trim)
  @IsOptional()
  @IsContactName()
  fullName?: string
}
