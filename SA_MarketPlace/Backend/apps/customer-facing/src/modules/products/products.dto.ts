import { ApiPropertyOptional } from '@nestjs/swagger'
import { PagingReqDto } from '@sa-marketplace/common'
import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator'
import { PriceRange } from './products.typing'

// Allowed sort fields and the column each maps to. Never pass orderField to SQL raw.
export const PRODUCT_SORT_COLUMNS = {
  name: 'product.name',
  price: 'product.price',
  created_at: 'product.createdAt',
} as const

// PagingReqDto supplies page, limit and order; this adds the catalogue filters.
export class ListProductsQueryDto extends PagingReqDto {
  /** One category. Leave it out for "All". */
  @IsOptional()
  @IsUUID()
  categoryId?: string

  /** One price-range filter. Leave it out for "Any price". */
  @IsOptional()
  @IsEnum(PriceRange)
  priceRange?: PriceRange

  /** Keyword matched against product name and description. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string

  // Overrides PagingReqDto's docs too, or Swagger would still show created_at.
  @ApiPropertyOptional({
    enum: Object.keys(PRODUCT_SORT_COLUMNS),
    default: 'name',
  })
  @IsOptional()
  @IsIn(Object.keys(PRODUCT_SORT_COLUMNS))
  readonly orderField: string = 'name'
}

export class ProductIdParamDto {
  @IsUUID()
  productId!: string
}
