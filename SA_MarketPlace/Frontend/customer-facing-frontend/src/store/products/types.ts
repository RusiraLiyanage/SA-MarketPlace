import type { PriceRange } from 'src/constants'

/** The catalogue query as the backend takes it (`GET /products`); anything left out means "no filter". */
export interface ListProductsRequest {
  /** Matched against the name and description. */
  search?: string
  categoryId?: string
  priceRange?: PriceRange
  orderField?: 'name' | 'price' | 'created_at'
  order?: 'ASC' | 'DESC'
  page?: number
  limit?: number
}
