import { ORDER_STATUS_FILTERS, PAGE_SIZE_OPTIONS } from 'src/constants'
import type { ListOrdersRequest } from 'src/store/orders/types'
import type { OrderStatus } from 'src/types'

export type OrderStatusFilter = (typeof ORDER_STATUS_FILTERS)[number]['value']

// My Orders' filter and paging. They live in the URL (as on the shop) so a view survives a refresh; `status`
// is named after the backend's query and left out for All.
export interface OrdersQuery {
  search: string
  status: OrderStatusFilter
  page: number
  limit: number
}

const statusValues: readonly string[] = ORDER_STATUS_FILTERS.map((filter) => filter.value)

export const parseOrdersQuery = (params: URLSearchParams): OrdersQuery => {
  const status = params.get('status') ?? ''
  const limit = Number(params.get('limit'))
  const page = Number(params.get('page'))

  return {
    search: params.get('search')?.trim() ?? '',
    status: statusValues.includes(status) ? (status as OrderStatusFilter) : 'all',
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    limit: (PAGE_SIZE_OPTIONS as readonly number[]).includes(limit) ? limit : PAGE_SIZE_OPTIONS[0],
  }
}

// Defaults are left out so the URL stays short.
export const toOrdersSearchParams = (query: OrdersQuery): URLSearchParams => {
  const params = new URLSearchParams()
  if (query.search) params.set('search', query.search)
  if (query.status !== 'all') params.set('status', query.status)
  if (query.page > 1) params.set('page', String(query.page))
  if (query.limit !== PAGE_SIZE_OPTIONS[0]) params.set('limit', String(query.limit))
  return params
}

export const hasOrdersFilter = (query: OrdersQuery): boolean => query.search !== '' || query.status !== 'all'

// The same query as the backend takes it: All is no status filter, and an empty search is left out. Newest first is its default.
export const toOrdersRequest = (query: OrdersQuery): ListOrdersRequest => ({
  status: query.status === 'all' ? undefined : (query.status as OrderStatus),
  search: query.search || undefined,
  page: query.page,
  limit: query.limit,
})
