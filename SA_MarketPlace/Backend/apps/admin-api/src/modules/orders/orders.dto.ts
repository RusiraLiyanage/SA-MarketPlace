import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger'
import {
  FulfilmentStage,
  PagingReqDto,
  SortOrder,
} from '@sa-marketplace/common'
import { PaymentStatus } from '@sa-marketplace/entities'
import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator'

// Allowed sort fields and the column each maps to. Never pass orderField to SQL raw.
export const ORDER_SORT_COLUMNS = {
  placed_at: 'order.placedAt',
  total: 'order.total',
  order_number: 'order.orderNumber',
} as const

// PagingReqDto supplies page and limit; this adds the orders filters and sort.
export class ListOrdersQueryDto extends PagingReqDto {
  /** One payment filter. Leave it out for "All". */
  @IsOptional()
  @IsEnum(PaymentStatus)
  payment?: PaymentStatus

  /** One fulfilment filter. Leave it out for "All". */
  @IsOptional()
  @IsEnum(FulfilmentStage)
  fulfilment?: FulfilmentStage

  /** Matched against the order number, the customer's organisation name or the buyer's name. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
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

// GET /orders/export: the table's filters and sort, with no paging, so the file holds every match.
export class ExportOrdersQueryDto extends PickType(ListOrdersQueryDto, [
  'payment',
  'fulfilment',
  'search',
  'order',
  'orderField',
] as const) {}

// :orderNumber in the order routes: the sequence-generated shape (ADR 0022), checked before any query.
export class OrderNumberParamDto {
  // Explicit pattern: the Swagger plugin copies the regex literal with its slashes,
  // which no order number matches, so Swagger UI blocked every request.
  @ApiProperty({ pattern: '^ORD-\\d{4}-\\d{5}$', example: 'ORD-2026-00123' })
  @Matches(/^ORD-\d{4}-\d{5}$/, {
    message: 'orderNumber must look like ORD-2026-00123',
  })
  orderNumber!: string
}
