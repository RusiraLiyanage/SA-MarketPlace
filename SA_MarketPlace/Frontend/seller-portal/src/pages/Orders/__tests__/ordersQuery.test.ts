import { describe, expect, it } from 'vitest'
import { hasOrdersFilter, parseOrdersQuery, toOrdersRequest, toOrdersSearchParams } from 'src/pages/Orders/ordersQuery'

describe('parseOrdersQuery', () => {
  it('starts with all orders, page 1 and ten rows', () => {
    expect(parseOrdersQuery(new URLSearchParams())).toEqual({ search: '', status: 'all', page: 1, limit: 10 })
  })

  it('reads what is in the address', () => {
    expect(parseOrdersQuery(new URLSearchParams('search= 126 &status=dispatched&page=3&limit=20'))).toEqual({
      search: '126',
      status: 'dispatched',
      page: 3,
      limit: 20,
    })
  })

  it('ignores a status, page or size the app does not offer, including "picking", which never matches a stored order', () => {
    expect(parseOrdersQuery(new URLSearchParams('status=picking&page=-2&limit=50'))).toEqual({ search: '', status: 'all', page: 1, limit: 10 })
  })
})

describe('toOrdersSearchParams', () => {
  it('leaves the defaults out so the address stays short', () => {
    expect(toOrdersSearchParams({ search: '', status: 'all', page: 1, limit: 10 }).toString()).toBe('')
    expect(toOrdersSearchParams({ search: '12', status: 'new', page: 2, limit: 30 }).toString()).toBe('search=12&status=new&page=2&limit=30')
  })
})

describe('toOrdersRequest', () => {
  it('sends no status for All and no search when it is empty', () => {
    expect(toOrdersRequest({ search: '', status: 'all', page: 1, limit: 10 })).toEqual({ status: undefined, search: undefined, page: 1, limit: 10 })
  })

  it('sends a chosen status and search as the backend takes them', () => {
    expect(toOrdersRequest({ search: '126', status: 'cancelled', page: 2, limit: 20 })).toEqual({ status: 'cancelled', search: '126', page: 2, limit: 20 })
  })
})

describe('hasOrdersFilter', () => {
  it('is true for a search or a status, not for paging', () => {
    expect(hasOrdersFilter({ search: 'x', status: 'all', page: 1, limit: 10 })).toBe(true)
    expect(hasOrdersFilter({ search: '', status: 'new', page: 1, limit: 10 })).toBe(true)
    expect(hasOrdersFilter({ search: '', status: 'all', page: 4, limit: 30 })).toBe(false)
  })
})
