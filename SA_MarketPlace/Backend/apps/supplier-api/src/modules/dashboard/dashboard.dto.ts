import { ApiPropertyOptional } from '@nestjs/swagger'
import { PagingReqDto, SortOrder } from '@sa-marketplace/common'
import { IsEnum, IsIn, IsOptional } from 'class-validator'

// Columns the seller can sort the dispatch queue by. Never pass orderField to
// SQL raw.
export const DISPATCH_QUEUE_SORT_COLUMNS = {
  placed_at: 'order.placedAt',
} as const

// PagingReqDto supplies page and limit; this sets the dispatch-queue defaults.
export class ListDispatchQueueQueryDto extends PagingReqDto {
  // Oldest first by default: every order of one seller shares the same SLA, so
  // the oldest is the one closest to breaching it.
  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.ASC })
  @IsOptional()
  @IsEnum(SortOrder)
  readonly order: SortOrder = SortOrder.ASC

  // Overrides PagingReqDto's docs too, or Swagger would still show created_at.
  @ApiPropertyOptional({
    enum: Object.keys(DISPATCH_QUEUE_SORT_COLUMNS),
    default: 'placed_at',
  })
  @IsOptional()
  @IsIn(Object.keys(DISPATCH_QUEUE_SORT_COLUMNS))
  readonly orderField: string = 'placed_at'
}
