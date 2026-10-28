import { CATALOGUE_SORT_FIELDS, CATALOGUE_STATUS_FILTERS, DEFAULT_CATALOGUE_SORT, PAGE_SIZE_OPTIONS } from 'src/constants'
import type { CatalogueSortField, ListCatalogueRequest, ListingStatus } from 'src/store/catalogue/types'

export type CatalogueStatusFilter = (typeof CATALOGUE_STATUS_FILTERS)[number]['value']

// The catalogue's filter, sort and paging. They live in the URL so a view survives a refresh; `status` is named after the
// backend's query and left out for All.
export interface CatalogueQuery {
  search: string
  status: CatalogueStatusFilter
  orderField: CatalogueSortField
  order: 'ASC' | 'DESC'
  page: number
  limit: number
}

const statusValues: readonly string[] = CATALOGUE_STATUS_FILTERS.map((filter) => filter.value)
const sortFields: readonly string[] = CATALOGUE_SORT_FIELDS

export const parseCatalogueQuery = (params: URLSearchParams): CatalogueQuery => {
  const status = params.get('status') ?? ''
  const orderField = params.get('orderField') ?? ''
  const limit = Number(params.get('limit'))
  const page = Number(params.get('page'))

  return {
    search: params.get('search')?.trim() ?? '',
    status: statusValues.includes(status) ? (status as CatalogueStatusFilter) : 'all',
    orderField: sortFields.includes(orderField) ? (orderField as CatalogueSortField) : DEFAULT_CATALOGUE_SORT.orderField,
    order: params.get('order') === 'DESC' ? 'DESC' : 'ASC',
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    limit: (PAGE_SIZE_OPTIONS as readonly number[]).includes(limit) ? limit : PAGE_SIZE_OPTIONS[0],
  }
}

const isDefaultSort = ({ orderField, order }: CatalogueQuery) =>
  orderField === DEFAULT_CATALOGUE_SORT.orderField && order === DEFAULT_CATALOGUE_SORT.order

// Defaults are left out so the URL stays short.
export const toCatalogueSearchParams = (query: CatalogueQuery): URLSearchParams => {
  const params = new URLSearchParams()
  if (query.search) params.set('search', query.search)
  if (query.status !== 'all') params.set('status', query.status)
  if (!isDefaultSort(query)) {
    params.set('orderField', query.orderField)
    params.set('order', query.order)
  }
  if (query.page > 1) params.set('page', String(query.page))
  if (query.limit !== PAGE_SIZE_OPTIONS[0]) params.set('limit', String(query.limit))
  return params
}

export const hasCatalogueFilter = (query: CatalogueQuery): boolean => query.search !== '' || query.status !== 'all'

// The same query as the backend takes it: All is no status filter, and an empty search is left out.
export const toCatalogueRequest = (query: CatalogueQuery): ListCatalogueRequest => ({
  status: query.status === 'all' ? undefined : (query.status as ListingStatus),
  search: query.search || undefined,
  orderField: query.orderField,
  order: query.order,
  page: query.page,
  limit: query.limit,
})
