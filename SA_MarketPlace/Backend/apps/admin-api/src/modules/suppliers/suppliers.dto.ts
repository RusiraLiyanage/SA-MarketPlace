import { ApiPropertyOptional } from '@nestjs/swagger'
import {
  PagingReqDto,
  SortOrder,
  trimToUndefined,
} from '@sa-marketplace/common'
import { SupplierStatus } from '@sa-marketplace/entities'
import { Transform } from 'class-transformer'
import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator'
import { RejectionReason } from './suppliers.constant'

// Allowed sort fields. `queue` is the default and needs no column: pending applications first,
// oldest first, then the decided ones, latest decision first. Never pass orderField to SQL raw.
export const SUPPLIER_SORT_COLUMNS = {
  business_name: 'supplier.businessName',
  submitted_at: 'supplier.submittedAt',
} as const

export const SUPPLIER_QUEUE_ORDER = 'queue'

// PagingReqDto supplies page and limit; this adds the verification filters and sort.
export class ListSuppliersQueryDto extends PagingReqDto {
  /** One status filter. Leave it out for "All". */
  @IsOptional()
  @IsEnum(SupplierStatus)
  status?: SupplierStatus

  /** Matched against the business name, or the ABN with or without spaces. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.ASC })
  @IsOptional()
  @IsEnum(SortOrder)
  readonly order: SortOrder = SortOrder.ASC

  // Overrides PagingReqDto's docs too, or Swagger would still show created_at.
  @ApiPropertyOptional({
    enum: [SUPPLIER_QUEUE_ORDER, ...Object.keys(SUPPLIER_SORT_COLUMNS)],
    default: SUPPLIER_QUEUE_ORDER,
  })
  @IsOptional()
  @IsIn([SUPPLIER_QUEUE_ORDER, ...Object.keys(SUPPLIER_SORT_COLUMNS)])
  readonly orderField: string = SUPPLIER_QUEUE_ORDER
}

// :supplierId in the application routes, checked before any query.
export class SupplierIdParamDto {
  @IsUUID()
  supplierId!: string
}

// POST /suppliers/:supplierId/reject. The reviewer and the time are the server's, never the body's.
export class RejectSupplierDto {
  @IsEnum(RejectionReason)
  reason!: RejectionReason

  /** Explains what to fix; required when the reason is "other". */
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(1000)
  detail?: string
}
