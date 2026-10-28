import type { OrderStatus } from 'src/types'

/** `GET /orders` as the backend takes it; anything left out means "no filter" and the newest first. */
export interface ListOrdersRequest {
  status?: OrderStatus
  /** Part of an order number, for example "00123". */
  search?: string
  orderField?: 'placed_at' | 'total'
  order?: 'ASC' | 'DESC'
  page?: number
  limit?: number
}
