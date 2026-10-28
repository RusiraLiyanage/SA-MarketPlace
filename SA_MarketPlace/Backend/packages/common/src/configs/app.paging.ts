import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { PAGINATION } from '../constant'

/** Named `SortOrder`, not `Order`: `Order` is the purchase-order entity (CLAUDE.md §4.3). */
export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class PagingReqDto {
  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.ASC })
  @IsEnum(SortOrder)
  @IsOptional()
  readonly order: SortOrder = SortOrder.ASC

  @ApiPropertyOptional({ minimum: 1, default: PAGINATION.DEFAULT_PAGE })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  readonly page: number = PAGINATION.DEFAULT_PAGE

  @ApiPropertyOptional({
    minimum: 1,
    maximum: PAGINATION.MAX_LIMIT,
    default: PAGINATION.DEFAULT_LIMIT,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION.MAX_LIMIT)
  @IsOptional()
  readonly limit: number = PAGINATION.DEFAULT_LIMIT

  /** SECURITY: caller text that reaches ORDER BY; never use in raw SQL, narrow with @IsIn([...]) per DTO. */
  @ApiPropertyOptional({ default: 'created_at' })
  @Type(() => String)
  @IsString()
  @IsOptional()
  readonly orderField: string = 'created_at'

  /** Rows to skip — maps directly onto TypeORM's `skip` find option. */
  get skip(): number {
    return this.limit * (this.page - 1)
  }

  /** Rows to return — maps directly onto TypeORM's `take` find option. */
  get take(): number {
    return this.limit
  }
}

export class PagingMetaDto {
  @ApiProperty()
  readonly page: number

  @ApiProperty()
  readonly limit: number

  @ApiProperty()
  readonly totalItem: number

  @ApiProperty()
  readonly totalPage: number

  @ApiProperty()
  readonly hasPreviousPage: boolean

  @ApiProperty()
  readonly hasNextPage: boolean

  constructor(pagingReqDto: PagingReqDto, totalItem: number) {
    this.page = pagingReqDto.page
    this.limit = pagingReqDto.limit
    this.totalItem = totalItem
    this.totalPage = Math.ceil(this.totalItem / this.limit)
    this.hasPreviousPage = this.page > 1
    this.hasNextPage = this.page < this.totalPage
  }
}

export interface TPagingResDto<T> {
  data: T[]
  pagingMeta: PagingMetaDto
}
