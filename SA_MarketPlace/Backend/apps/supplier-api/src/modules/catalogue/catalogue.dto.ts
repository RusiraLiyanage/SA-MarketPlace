import { ApiPropertyOptional } from '@nestjs/swagger'
import {
  PagingReqDto,
  trim,
  trimToNull,
  trimToUndefined,
} from '@sa-marketplace/common'
import { ListingStatus } from '@sa-marketplace/entities'
import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator'
import { PRODUCT_IMAGE_LIMITS } from './catalogue.constant'

// Allowed sort fields and the column each maps to. Never pass orderField to SQL raw.
export const CATALOGUE_SORT_COLUMNS = {
  name: 'product.name',
  price: 'product.price',
  quantity: 'product.quantity',
} as const

// PagingReqDto supplies order (ASC by default), page and limit; this adds the catalogue filters and sort.
export class ListCatalogueQueryDto extends PagingReqDto {
  /** One listing status filter. Leave it out for "All", which includes retired. */
  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus

  /** Matched against the product name and SKU. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string

  // Overrides PagingReqDto's docs too, or Swagger would still show created_at.
  @ApiPropertyOptional({
    enum: Object.keys(CATALOGUE_SORT_COLUMNS),
    default: 'name',
  })
  @IsOptional()
  @IsIn(Object.keys(CATALOGUE_SORT_COLUMNS))
  readonly orderField: string = 'name'
}

// Save draft and Publish are the only statuses a seller sets; retiring is its own action.
const SETTABLE_STATUSES = [ListingStatus.draft, ListingStatus.published]

const PRICE_PATTERN = /^(?!0+(\.0+)?$)\d{1,8}(\.\d{1,2})?$/
const PRICE_MESSAGE = 'price must be above 0 with at most 2 decimal places'

// POST /catalogue, as JSON or multipart (fields plus up to 4 `images` files).
// supplierProfileId is never accepted: it comes from the token (§7).
export class CreateProductDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string

  /** Required to publish; a draft may leave it out. */
  @ValidateIf(
    (dto: CreateProductDto) =>
      dto.listingStatus === ListingStatus.published ||
      dto.description !== undefined,
  )
  @Transform(trimToUndefined)
  @IsString()
  @IsNotEmpty({ message: 'description is required to publish' })
  @MaxLength(5000)
  description?: string

  /** Unique per seller, so a clash is a 409 from the service, not a validation error. */
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  sku!: string

  /** GST-inclusive, as a string (ADR 0008): above zero, at most two decimals. */
  @Matches(PRICE_PATTERN, { message: PRICE_MESSAGE })
  price!: string

  /** The sub-category if one is chosen, else the category. */
  @IsUUID()
  categoryId!: string

  /** Defaults to 0: a draft can be saved before stock arrives. */
  // Explicit @Type: multipart sends numbers as strings, and the inferred type emits no metadata.
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  quantity = 0

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold = 0

  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string

  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  manufacturer?: string

  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(60)
  packSize?: string

  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  certification?: string

  @ApiPropertyOptional({
    enum: SETTABLE_STATUSES,
    default: ListingStatus.draft,
  })
  @IsOptional()
  @IsIn(SETTABLE_STATUSES)
  listingStatus: ListingStatus = ListingStatus.draft

  // Files are read by multer, never from this body. @IsOptional only keeps Swagger's example JSON from being
  // rejected as an unknown field; the value is ignored.
  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    maxItems: PRODUCT_IMAGE_LIMITS.MAX_COUNT,
    description:
      'Image files to add (JPEG, PNG or WebP, 5 MB each; at most 4 images on the product). The first is the primary image.',
  })
  @IsOptional()
  images?: Express.Multer.File[]
}

// :productId in the path; checked before any query.
export class ProductIdParamDto {
  @IsUUID()
  productId!: string
}

// PATCH /catalogue/:productId, as JSON or multipart. Every field is optional and only what is
// sent changes, so there are no defaults here (they would silently reset stock). Unlike create,
// a blank optional text means "clear it". supplierProfileId is never accepted (§7).
export class UpdateProductDto {
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string

  /** Blank clears it; the service refuses that while the product is published. */
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null

  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  sku?: string

  @IsOptional()
  @Matches(PRICE_PATTERN, { message: PRICE_MESSAGE })
  price?: string

  /** The sub-category if one is chosen, else the category. */
  @IsOptional()
  @IsUUID()
  categoryId?: string

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string | null

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  manufacturer?: string | null

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(60)
  packSize?: string | null

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  certification?: string | null

  @ApiPropertyOptional({ enum: SETTABLE_STATUSES })
  @IsOptional()
  @IsIn(SETTABLE_STATUSES)
  listingStatus?: ListingStatus

  // Files are read by multer, never from this body. @IsOptional only keeps Swagger's example JSON from being
  // rejected as an unknown field; the value is ignored.
  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    maxItems: PRODUCT_IMAGE_LIMITS.MAX_COUNT,
    description:
      'Image files to add (JPEG, PNG or WebP, 5 MB each; at most 4 images after removals, kept plus new). The first is the primary image.',
  })
  @IsOptional()
  images?: Express.Multer.File[]

  /** Existing images to delete. A single value in multipart arrives as a string, so it is wrapped. */
  @Transform(({ value }: { value: unknown }) =>
    value === undefined || Array.isArray(value) ? value : [value],
  )
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(PRODUCT_IMAGE_LIMITS.MAX_COUNT)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  removeImageIds?: string[]
}
