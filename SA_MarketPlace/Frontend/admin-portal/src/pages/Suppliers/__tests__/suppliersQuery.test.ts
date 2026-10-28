import { describe, expect, it } from 'vitest'
import { hasSuppliersFilter, parseSuppliersQuery, toSuppliersRequest, toSuppliersSearchParams } from 'src/pages/Suppliers/suppliersQuery'

const parse = (search: string) => parseSuppliersQuery(new URLSearchParams(search))

describe('parseSuppliersQuery', () => {
  it('starts on Pending review, page 1, ten a page, with no search', () => {
    expect(parse('')).toEqual({ search: '', status: 'pending_review', page: 1, limit: 10 })
  })

  it('reads what the address holds', () => {
    expect(parse('search=bindi&status=approved&page=2&limit=20')).toEqual({ search: 'bindi', status: 'approved', page: 2, limit: 20 })
    expect(parse('status=all').status).toBe('all')
  })

  it('ignores a status, page or size that makes no sense', () => {
    expect(parse('status=suspended&page=0&limit=7')).toEqual({ search: '', status: 'pending_review', page: 1, limit: 10 })
    expect(parse('page=abc').page).toBe(1)
  })
})

describe('toSuppliersSearchParams', () => {
  it('leaves the defaults out', () => {
    expect(toSuppliersSearchParams({ search: '', status: 'pending_review', page: 1, limit: 10 }).toString()).toBe('')
  })

  it('writes All out, because it is the one that is not the default', () => {
    expect(toSuppliersSearchParams({ search: 'bindi', status: 'all', page: 2, limit: 20 }).toString()).toBe('search=bindi&status=all&page=2&limit=20')
  })

  it('round-trips', () => {
    const query = { search: '51 824', status: 'rejected', page: 3, limit: 30 } as const
    expect(parseSuppliersQuery(toSuppliersSearchParams(query))).toEqual(query)
  })
})

describe('toSuppliersRequest', () => {
  it('sends no status for All, and no empty search', () => {
    expect(toSuppliersRequest({ search: '', status: 'all', page: 1, limit: 10 })).toEqual({ status: undefined, search: undefined, page: 1, limit: 10 })
  })

  it("sends the backend's own status value", () => {
    expect(toSuppliersRequest({ search: 'bindi', status: 'pending_review', page: 2, limit: 20 })).toEqual({
      status: 'pending_review',
      search: 'bindi',
      page: 2,
      limit: 20,
    })
  })
})

describe('hasSuppliersFilter', () => {
  it('is true for a search or any one status, and false for All', () => {
    expect(hasSuppliersFilter({ search: '', status: 'all', page: 1, limit: 10 })).toBe(false)
    expect(hasSuppliersFilter({ search: 'x', status: 'all', page: 1, limit: 10 })).toBe(true)
    expect(hasSuppliersFilter({ search: '', status: 'approved', page: 1, limit: 10 })).toBe(true)
  })
})
