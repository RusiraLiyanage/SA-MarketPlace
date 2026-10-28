import { DEFAULT_SUPPLIER_FILTER, PAGE_SIZE_OPTIONS, SUPPLIER_STATUS_FILTERS } from 'src/constants'
import type { ListSuppliersRequest, SupplierStatus } from 'src/store/suppliers/types'

export type SupplierFilter = (typeof SUPPLIER_STATUS_FILTERS)[number]['value']

// The queue's filter and paging. They live in the address so a view survives a refresh. An address with no `status` is the
// default (Pending review); All is written out, since it is the one that sends no filter.
export interface SuppliersQuery {
  search: string
  status: SupplierFilter
  page: number
  limit: number
}

const filterValues: readonly string[] = SUPPLIER_STATUS_FILTERS.map((filter) => filter.value)

export const parseSuppliersQuery = (params: URLSearchParams): SuppliersQuery => {
  const status = params.get('status') ?? ''
  const limit = Number(params.get('limit'))
  const page = Number(params.get('page'))

  return {
    search: params.get('search')?.trim() ?? '',
    status: filterValues.includes(status) ? (status as SupplierFilter) : DEFAULT_SUPPLIER_FILTER,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    limit: (PAGE_SIZE_OPTIONS as readonly number[]).includes(limit) ? limit : PAGE_SIZE_OPTIONS[0],
  }
}

// Defaults are left out so the address stays short.
export const toSuppliersSearchParams = (query: SuppliersQuery): URLSearchParams => {
  const params = new URLSearchParams()
  if (query.search) params.set('search', query.search)
  if (query.status !== DEFAULT_SUPPLIER_FILTER) params.set('status', query.status)
  if (query.page > 1) params.set('page', String(query.page))
  if (query.limit !== PAGE_SIZE_OPTIONS[0]) params.set('limit', String(query.limit))
  return params
}

/** A search, or a status other than All: an empty table then means "nothing matches". */
export const hasSuppliersFilter = (query: SuppliersQuery): boolean => query.search !== '' || query.status !== 'all'

// The same query as the backend takes it: All is no status filter, and an empty search is left out.
export const toSuppliersRequest = (query: SuppliersQuery): ListSuppliersRequest => ({
  status: query.status === 'all' ? undefined : (query.status as SupplierStatus),
  search: query.search || undefined,
  page: query.page,
  limit: query.limit,
})
