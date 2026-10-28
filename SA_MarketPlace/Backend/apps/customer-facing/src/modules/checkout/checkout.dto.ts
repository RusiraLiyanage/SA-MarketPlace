import { PaymentMethod } from '@sa-marketplace/entities'
import { Type } from 'class-transformer'
import {
  IsDefined,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator'
import { AU_STATES } from './checkout.constant'

export class DeliveryDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  attentionName?: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  streetAddress!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  suburb!: string

  @IsIn(AU_STATES)
  state!: string

  @Matches(/^\d{4}$/, { message: 'postcode must be 4 digits' })
  postcode!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string
}

// Card details live only for the length of the request: never stored, never logged (§4.6).
// Send number and cvc as strings, or leading zeros are lost.
export class CardDto {
  /** 13 to 19 digits. Spaces are allowed and stripped by the payment service. */
  @Matches(/^[\d ]{13,23}$/, { message: 'number must be 13 to 19 digits' })
  number!: string

  @IsInt()
  @Min(1)
  @Max(12)
  expiryMonth!: number

  /** Four digits, e.g. 2029. Whether it is in the past is checked by the payment service. */
  @IsInt()
  @Min(2000)
  @Max(2100)
  expiryYear!: number

  @Matches(/^\d{3,4}$/, { message: 'cvc must be 3 or 4 digits' })
  cvc!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nameOnCard!: string
}

export class PaymentDto {
  @IsEnum(PaymentMethod)
  method!: PaymentMethod

  // Required for card_mock only. invoice_on_account has no card, and any card sent
  // with it is ignored by the service.
  @ValidateIf(
    (payment: PaymentDto) => payment.method === PaymentMethod.cardMock,
  )
  @IsDefined()
  @ValidateNested()
  @Type(() => CardDto)
  card?: CardDto
}

export class PlaceOrderDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => DeliveryDto)
  delivery!: DeliveryDto

  @IsDefined()
  @ValidateNested()
  @Type(() => PaymentDto)
  payment!: PaymentDto
}
