import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { PagingReqDto, SortOrder } from '@sa-marketplace/common'
import { OrderStatus } from '@sa-marketplace/entities'
import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator'

// Columns the buyer can sort My Orders by. Never pass orderField to SQL raw.
export const ORDER_SORT_COLUMNS = {
  placed_at: 'order.placedAt',
  total: 'order.total',
} as const

// PagingReqDto supplies page and limit; this adds the My Orders filter and sort.
export class ListOrdersQueryDto extends PagingReqDto {
  /** One status filter. Leave it out for "All". */
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus

  /** Part of an order number, e.g. "00123". Leave it out for every order. */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  search?: string

  // Most recent order first by default — PagingReqDto itself defaults to ASC.
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

// GET /orders/:orderNumber — the sequence-generated shape (ADR 0022), checked
// before it ever reaches a query.
export class OrderNumberParamDto {
  // Explicit pattern: the Swagger plugin copies the regex literal with its slashes,
  // which no order number matches, so Swagger UI blocked every request.
  @ApiProperty({ pattern: '^ORD-\\d{4}-\\d{5}$', example: 'ORD-2026-00123' })
  @Matches(/^ORD-\d{4}-\d{5}$/, {
    message: 'orderNumber must look like ORD-2026-00123',
  })
  orderNumber!: string
}
