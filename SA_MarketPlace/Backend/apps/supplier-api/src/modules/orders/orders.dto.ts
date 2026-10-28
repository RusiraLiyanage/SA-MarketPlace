import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { PagingReqDto, SortOrder } from '@sa-marketplace/common'
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator'
import { CancelReason, SellerOrderStatus } from './orders.typing'

// Allowed sort fields and the column each maps to. Never pass orderField to SQL raw.
export const ORDER_SORT_COLUMNS = {
  placed_at: 'order.placedAt',
  total: 'order.total',
} as const

// PagingReqDto supplies page and limit; this adds the orders filters and sort.
export class ListOrdersQueryDto extends PagingReqDto {
  /** One status filter. Leave it out for "All". */
  @IsOptional()
  @IsEnum(SellerOrderStatus)
  status?: SellerOrderStatus

  /** Matched against the order number, e.g. "00126". */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  search?: string

  // Newest first by default; PagingReqDto itself defaults to ASC.
  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  readonly order: SortOrder = SortOrder.DESC

  // Overrides PagingReqDto's docs too, or Swagger would still show created_at.
  @ApiPropertyOptional({
    enum: Object.keys(ORDER_SORT_COLUMNS),
    default: 'placed_at',
  })
  @IsOptional()
  @IsIn(Object.keys(ORDER_SORT_COLUMNS))
  readonly orderField: string = 'placed_at'
}

// GET /orders/:orderNumber: the sequence-generated shape (ADR 0022), checked before any query.
export class OrderNumberParamDto {
  // Explicit pattern: the Swagger plugin copies the regex literal with its slashes,
  // which no order number matches, so Swagger UI blocked every request.
  @ApiProperty({ pattern: '^ORD-\\d{4}-\\d{5}$', example: 'ORD-2026-00123' })
  @Matches(/^ORD-\d{4}-\d{5}$/, {
    message: 'orderNumber must look like ORD-2026-00123',
  })
  orderNumber!: string
}

// POST /orders/:orderNumber/dispatch. The times are the server's, never the caller's:
// dispatchedAt is now (ADR 0033) and the estimate is worked out as at checkout.
// Both fields are required because db:verify holds every dispatched order to a
// carrier and a tracking number.
export class DispatchOrderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  carrierName!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  trackingNumber!: string
}

// POST /orders/:orderNumber/cancel.
export class CancelOrderDto {
  @IsEnum(CancelReason)
  reason!: CancelReason

  /** Extra context for the buyer. Required when the reason is "other". */
  @ValidateIf(
    (dto: CancelOrderDto) =>
      dto.reason === CancelReason.other || dto.notes !== undefined,
  )
  @IsString()
  @IsNotEmpty({ message: 'notes are required when the reason is other' })
  @MaxLength(500)
  notes?: string
}
