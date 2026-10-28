import { DEFAULT_ORDER_SORT, FULFILMENT_FILTERS, ORDER_SORT_FIELDS, PAGE_SIZE_OPTIONS, PAYMENT_FILTERS } from 'src/constants'
import type { FulfilmentStage, ListOrdersRequest, OrderSortField, OrdersFilter, PaymentStatus } from 'src/store/orders/types'

export type PaymentFilter = (typeof PAYMENT_FILTERS)[number]['value']
export type FulfilmentFilter = (typeof FULFILMENT_FILTERS)[number]['value']

// The orders list's filters, sort and paging. They live in the address so a view survives a refresh; `payment` and `fulfilment` are
// named after the backend's query and left out for All.
export interface OrdersQuery {
  search: string
  payment: PaymentFilter
  fulfilment: FulfilmentFilter
  orderField: OrderSortField
  order: 'ASC' | 'DESC'
  page: number
  limit: number
}

const paymentValues: readonly string[] = PAYMENT_FILTERS.map((filter) => filter.value)
const fulfilmentValues: readonly string[] = FULFILMENT_FILTERS.map((filter) => filter.value)
const sortFields: readonly string[] = ORDER_SORT_FIELDS

export const parseOrdersQuery = (params: URLSearchParams): OrdersQuery => {
  const payment = params.get('payment') ?? ''
  const fulfilment = params.get('fulfilment') ?? ''
  const orderField = params.get('orderField') ?? ''
  const limit = Number(params.get('limit'))
  const page = Number(params.get('page'))

  return {
    search: params.get('search')?.trim() ?? '',
    payment: paymentValues.includes(payment) ? (payment as PaymentFilter) : 'all',
    fulfilment: fulfilmentValues.includes(fulfilment) ? (fulfilment as FulfilmentFilter) : 'all',
    orderField: sortFields.includes(orderField) ? (orderField as OrderSortField) : DEFAULT_ORDER_SORT.orderField,
    order: params.get('order') === 'ASC' ? 'ASC' : params.get('order') === 'DESC' ? 'DESC' : DEFAULT_ORDER_SORT.order,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    limit: (PAGE_SIZE_OPTIONS as readonly number[]).includes(limit) ? limit : PAGE_SIZE_OPTIONS[0],
  }
}

const isDefaultSort = ({ orderField, order }: OrdersQuery) => orderField === DEFAULT_ORDER_SORT.orderField && order === DEFAULT_ORDER_SORT.order

// Defaults are left out so the address stays short.
export const toOrdersSearchParams = (query: OrdersQuery): URLSearchParams => {
  const params = new URLSearchParams()
  if (query.search) params.set('search', query.search)
  if (query.payment !== 'all') params.set('payment', query.payment)
  if (query.fulfilment !== 'all') params.set('fulfilment', query.fulfilment)
  if (!isDefaultSort(query)) {
    params.set('orderField', query.orderField)
    params.set('order', query.order)
  }
  if (query.page > 1) params.set('page', String(query.page))
  if (query.limit !== PAGE_SIZE_OPTIONS[0]) params.set('limit', String(query.limit))
  return params
}

export const hasOrdersFilter = (query: OrdersQuery): boolean => query.search !== '' || query.payment !== 'all' || query.fulfilment !== 'all'

// What the table and the CSV export both send: the filters and the sort, in the backend's own words. All is no filter, and an empty
// search is left out.
export const toOrdersFilter = (query: OrdersQuery): OrdersFilter => ({
  payment: query.payment === 'all' ? undefined : (query.payment as PaymentStatus),
  fulfilment: query.fulfilment === 'all' ? undefined : (query.fulfilment as FulfilmentStage),
  search: query.search || undefined,
  orderField: query.orderField,
  order: query.order,
})

export const toOrdersRequest = (query: OrdersQuery): ListOrdersRequest => ({ ...toOrdersFilter(query), page: query.page, limit: query.limit })
