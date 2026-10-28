import { describe, expect, it } from 'vitest'
import { hasOrdersFilter, parseOrdersQuery, toOrdersFilter, toOrdersRequest, toOrdersSearchParams } from 'src/pages/Orders/ordersQuery'

const parse = (search: string) => parseOrdersQuery(new URLSearchParams(search))
const base = { search: '', payment: 'all', fulfilment: 'all', orderField: 'placed_at', order: 'DESC', page: 1, limit: 10 } as const

describe('parseOrdersQuery', () => {
  it('starts on every order, newest first, page 1, ten a page', () => {
    expect(parse('')).toEqual(base)
  })

  it('reads what the address holds', () => {
    expect(parse('search=worksafe&payment=paid&fulfilment=picking&orderField=total&order=ASC&page=2&limit=20')).toEqual({
      search: 'worksafe',
      payment: 'paid',
      fulfilment: 'picking',
      orderField: 'total',
      order: 'ASC',
      page: 2,
      limit: 20,
    })
  })

  it('ignores a value that makes no sense', () => {
    expect(parse('payment=bitcoin&fulfilment=lost&orderField=customer&order=sideways&page=0&limit=7')).toEqual(base)
  })
})

describe('toOrdersSearchParams', () => {
  it('leaves the defaults out', () => {
    expect(toOrdersSearchParams(base).toString()).toBe('')
  })

  it('writes the sort only when it is not newest first', () => {
    expect(toOrdersSearchParams({ ...base, orderField: 'total', order: 'ASC' }).toString()).toBe('orderField=total&order=ASC')
    expect(toOrdersSearchParams({ ...base, order: 'ASC' }).toString()).toBe('orderField=placed_at&order=ASC')
  })

  it('round-trips', () => {
    const query = { search: 'ORD-2026', payment: 'refunded', fulfilment: 'cancelled', orderField: 'order_number', order: 'ASC', page: 3, limit: 30 } as const
    expect(parseOrdersQuery(toOrdersSearchParams(query))).toEqual(query)
  })
})

describe('toOrdersFilter and toOrdersRequest', () => {
  it('sends no filter for All and no empty search', () => {
    expect(toOrdersFilter(base)).toEqual({ payment: undefined, fulfilment: undefined, search: undefined, orderField: 'placed_at', order: 'DESC' })
  })

  it("sends the backend's own values, with paging only on the list", () => {
    const query = { ...base, search: 'mining', payment: 'pending', fulfilment: 'dispatched', page: 2, limit: 20 } as const

    expect(toOrdersFilter(query)).toEqual({ payment: 'pending', fulfilment: 'dispatched', search: 'mining', orderField: 'placed_at', order: 'DESC' })
    expect(toOrdersRequest(query)).toMatchObject({ payment: 'pending', page: 2, limit: 20 })
    expect(toOrdersFilter(query)).not.toHaveProperty('page')
  })
})

describe('hasOrdersFilter', () => {
  it('is true for a search or either filter, and false for neither', () => {
    expect(hasOrdersFilter(base)).toBe(false)
    expect(hasOrdersFilter({ ...base, search: 'x' })).toBe(true)
    expect(hasOrdersFilter({ ...base, payment: 'paid' })).toBe(true)
    expect(hasOrdersFilter({ ...base, fulfilment: 'received' })).toBe(true)
  })
})
