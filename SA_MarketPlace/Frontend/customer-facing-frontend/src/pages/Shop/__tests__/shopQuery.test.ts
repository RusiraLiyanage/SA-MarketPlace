import { describe, expect, it } from 'vitest'
import { DEFAULT_SORT } from 'src/constants'
import { parseShopQuery, toProductsRequest, toSearchParams } from 'src/pages/Shop/shopQuery'

describe('parseShopQuery', () => {
  it('uses the defaults for an empty URL', () => {
    expect(parseShopQuery(new URLSearchParams())).toEqual({
      search: '',
      categoryId: undefined,
      priceRange: undefined,
      sort: DEFAULT_SORT,
      page: 1,
      limit: 10,
    })
  })

  it('reads every filter', () => {
    const query = parseShopQuery(
      new URLSearchParams('search=gloves&categoryId=abc&priceRange=under_20&sort=price_desc&page=3&limit=20'),
    )

    expect(query).toEqual({
      search: 'gloves',
      categoryId: 'abc',
      priceRange: 'under_20',
      sort: 'price_desc',
      page: 3,
      limit: 20,
    })
  })

  it.each([
    ['priceRange=nonsense'],
    ['priceRange=any'],
    ['sort=drop-table'],
    ['page=0'],
    ['page=-2'],
    ['page=1.5'],
    ['limit=999'],
  ])('ignores the invalid value in %s', (qs) => {
    expect(parseShopQuery(new URLSearchParams(qs))).toEqual(parseShopQuery(new URLSearchParams()))
  })

  it('trims the search text', () => {
    expect(parseShopQuery(new URLSearchParams('search=%20%20kit%20')).search).toBe('kit')
  })
})

describe('toSearchParams', () => {
  it('leaves defaults out of the URL', () => {
    expect(toSearchParams(parseShopQuery(new URLSearchParams())).toString()).toBe('')
  })

  it('round-trips a full query', () => {
    const qs = 'search=gloves&categoryId=abc&priceRange=under_20&sort=price_desc&page=3&limit=20'
    const query = parseShopQuery(new URLSearchParams(qs))
    expect(parseShopQuery(toSearchParams(query))).toEqual(query)
  })
})

describe('toProductsRequest', () => {
  it('maps the sort choice to the backend field and direction, and leaves empty filters out', () => {
    const request = toProductsRequest(parseShopQuery(new URLSearchParams('sort=price_desc&page=2&limit=20')))

    expect(request).toEqual({
      search: undefined,
      categoryId: undefined,
      priceRange: undefined,
      orderField: 'price',
      order: 'DESC',
      page: 2,
      limit: 20,
    })
  })

  it('passes the search, category and price range as they are', () => {
    const request = toProductsRequest(parseShopQuery(new URLSearchParams('search=gloves&categoryId=abc&priceRange=under_20')))

    expect(request).toMatchObject({ search: 'gloves', categoryId: 'abc', priceRange: 'under_20', orderField: 'name', order: 'ASC' })
  })
})
