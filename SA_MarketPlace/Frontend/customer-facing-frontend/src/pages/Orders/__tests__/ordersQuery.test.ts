import { describe, expect, it } from 'vitest'
import { hasOrdersFilter, parseOrdersQuery, toOrdersSearchParams } from 'src/pages/Orders/ordersQuery'

describe('ordersQuery', () => {
  it('defaults to All, page 1, 10 per page', () => {
    expect(parseOrdersQuery(new URLSearchParams())).toEqual({ search: '', status: 'all', page: 1, limit: 10 })
  })

  it('ignores a status or size it does not offer', () => {
    const query = parseOrdersQuery(new URLSearchParams('status=cancelled&limit=7&page=0'))

    expect(query).toMatchObject({ status: 'all', limit: 10, page: 1 })
  })

  it('round-trips and leaves defaults out of the URL', () => {
    const query = parseOrdersQuery(new URLSearchParams('search=ORD-2026-00123&status=dispatched&page=2&limit=20'))

    expect(query).toEqual({ search: 'ORD-2026-00123', status: 'dispatched', page: 2, limit: 20 })
    expect(toOrdersSearchParams(query).toString()).toBe('search=ORD-2026-00123&status=dispatched&page=2&limit=20')
    expect(toOrdersSearchParams(parseOrdersQuery(new URLSearchParams())).toString()).toBe('')
  })

  it('knows when a filter is applied', () => {
    expect(hasOrdersFilter(parseOrdersQuery(new URLSearchParams()))).toBe(false)
    expect(hasOrdersFilter(parseOrdersQuery(new URLSearchParams('status=placed')))).toBe(true)
    expect(hasOrdersFilter(parseOrdersQuery(new URLSearchParams('search=1')))).toBe(true)
  })
})
