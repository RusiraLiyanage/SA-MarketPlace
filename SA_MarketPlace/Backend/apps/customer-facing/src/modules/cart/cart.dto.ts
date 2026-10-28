import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator'

// A sane ceiling per line, so one request cannot ask for a million units.
export const MAX_ITEM_QUANTITY = 999

export class AddCartItemDto {
  @IsUUID()
  productId!: string

  /** Added to whatever is already in the cart for this product. Defaults to 1. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_ITEM_QUANTITY)
  quantity?: number
}

export class UpdateCartItemQuantityDto {
  /** The new absolute quantity. 0 removes the line. */
  @IsInt()
  @Min(0)
  @Max(MAX_ITEM_QUANTITY)
  quantity!: number
}

export class CartItemParamDto {
  @IsUUID()
  productId!: string
}
