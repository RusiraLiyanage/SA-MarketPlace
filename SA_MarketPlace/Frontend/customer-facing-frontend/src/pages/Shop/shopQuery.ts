import { DEFAULT_SORT, PAGE_SIZE_OPTIONS, PRICE_RANGES, SORT_OPTIONS, type PriceRange, type SortKey } from 'src/constants'
import type { ListProductsRequest } from 'src/store/products/types'

// The catalogue's filters, sort and paging. They live in the URL so a filtered view can be shared and
// survives a refresh; the names follow the backend's query so the API call is a straight copy.
export interface ShopQuery {
  search: string
  categoryId?: string
  priceRange?: PriceRange
  sort: SortKey
  page: number
  limit: number
}

const isOneOf = <T extends string>(values: readonly T[], value: string | null): value is T =>
  value !== null && (values as readonly string[]).includes(value)

export const parseShopQuery = (params: URLSearchParams): ShopQuery => {
  const priceRange = params.get('priceRange')
  const sort = params.get('sort')
  const limit = Number(params.get('limit'))
  const page = Number(params.get('page'))

  return {
    search: params.get('search')?.trim() ?? '',
    categoryId: params.get('categoryId') || undefined,
    priceRange: isOneOf(PRICE_RANGES.map((range) => range.value), priceRange) && priceRange !== 'any' ? priceRange : undefined,
    sort: isOneOf(SORT_OPTIONS.map((option) => option.value), sort) ? sort : DEFAULT_SORT,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    limit: (PAGE_SIZE_OPTIONS as readonly number[]).includes(limit) ? limit : PAGE_SIZE_OPTIONS[0],
  }
}

// Defaults are left out so the URL stays short.
export const toSearchParams = (query: ShopQuery): URLSearchParams => {
  const params = new URLSearchParams()
  if (query.search) params.set('search', query.search)
  if (query.categoryId) params.set('categoryId', query.categoryId)
  if (query.priceRange) params.set('priceRange', query.priceRange)
  if (query.sort !== DEFAULT_SORT) params.set('sort', query.sort)
  if (query.page > 1) params.set('page', String(query.page))
  if (query.limit !== PAGE_SIZE_OPTIONS[0]) params.set('limit', String(query.limit))
  return params
}

// The same query as the backend takes it: the sort choice becomes its field and direction, and an empty search is left out.
export const toProductsRequest = (query: ShopQuery): ListProductsRequest => {
  const { orderField, order } = SORT_OPTIONS.find((option) => option.value === query.sort)!
  return {
    search: query.search || undefined,
    categoryId: query.categoryId,
    priceRange: query.priceRange,
    orderField,
    order,
    page: query.page,
    limit: query.limit,
  }
}
