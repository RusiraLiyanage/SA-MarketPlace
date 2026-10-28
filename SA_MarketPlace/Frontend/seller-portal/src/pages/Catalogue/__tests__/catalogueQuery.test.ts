import { describe, expect, it } from 'vitest'
import { hasCatalogueFilter, parseCatalogueQuery, toCatalogueRequest, toCatalogueSearchParams } from 'src/pages/Catalogue/catalogueQuery'

const base = { search: '', status: 'all', orderField: 'name', order: 'ASC', page: 1, limit: 10 } as const

describe('parseCatalogueQuery', () => {
  it('starts with everything, sorted by name, page 1 and ten rows', () => {
    expect(parseCatalogueQuery(new URLSearchParams())).toEqual(base)
  })

  it('reads what is in the address', () => {
    expect(parseCatalogueQuery(new URLSearchParams('search= kit &status=retired&orderField=price&order=DESC&page=2&limit=30'))).toEqual({
      search: 'kit',
      status: 'retired',
      orderField: 'price',
      order: 'DESC',
      page: 2,
      limit: 30,
    })
  })

  it('ignores a status, sort field, order, page or size the app does not offer', () => {
    expect(parseCatalogueQuery(new URLSearchParams('status=deleted&orderField=created_at&order=UP&page=0&limit=7'))).toEqual(base)
  })
})

describe('toCatalogueSearchParams', () => {
  it('leaves the defaults out, including the default sort', () => {
    expect(toCatalogueSearchParams(base).toString()).toBe('')
  })

  it('writes the sort as a pair once it is not the default', () => {
    expect(toCatalogueSearchParams({ ...base, orderField: 'quantity', order: 'ASC' }).toString()).toBe('orderField=quantity&order=ASC')
    expect(toCatalogueSearchParams({ ...base, order: 'DESC' }).toString()).toBe('orderField=name&order=DESC')
  })

  it('writes everything else that is set', () => {
    expect(toCatalogueSearchParams({ ...base, search: 'kit', status: 'draft', page: 3, limit: 20 }).toString()).toBe('search=kit&status=draft&page=3&limit=20')
  })
})

describe('toCatalogueRequest', () => {
  it('sends no status for All, nor an empty search', () => {
    expect(toCatalogueRequest(base)).toEqual({ status: undefined, search: undefined, orderField: 'name', order: 'ASC', page: 1, limit: 10 })
  })

  it('sends a chosen status, search and sort as the backend takes them', () => {
    expect(toCatalogueRequest({ ...base, status: 'published', search: 'UCK', orderField: 'price', order: 'DESC' })).toMatchObject({
      status: 'published',
      search: 'UCK',
      orderField: 'price',
      order: 'DESC',
    })
  })
})

describe('hasCatalogueFilter', () => {
  it('is true for a search or a status, not for sorting or paging', () => {
    expect(hasCatalogueFilter({ ...base, search: 'x' })).toBe(true)
    expect(hasCatalogueFilter({ ...base, status: 'draft' })).toBe(true)
    expect(hasCatalogueFilter({ ...base, orderField: 'price', page: 4 })).toBe(false)
  })
})
