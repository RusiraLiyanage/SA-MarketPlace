import { IsContactName, trim, trimToNull } from '@sa-marketplace/common'
import { Transform, Type } from 'class-transformer'
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

// PATCH /auth/profile: partial, so only what is sent changes and there are no defaults.
// Never email, ABN or business name (identity the admin verified, ADR 0037), nor password.
// A blank businessType or defaultCarrier clears it.
export class UpdateProfileDto {
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessType?: string | null

  // At least two words: the service splits it into first and last name (ADR 0031).
  @Transform(trim)
  @IsOptional()
  @IsContactName()
  contactName?: string

  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phone?: string

  /** Whole hours; the dashboard countdown uses it for every open order. */
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  dispatchSlaHours?: number

  /** Free text, only prefills the dispatch form. */
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  defaultCarrier?: string | null
}
