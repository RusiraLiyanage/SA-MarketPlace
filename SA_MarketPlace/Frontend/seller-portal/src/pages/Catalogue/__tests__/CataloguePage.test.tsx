import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CataloguePage from 'src/pages/Catalogue'
import { useListCatalogueQuery } from 'src/store/catalogue/actions'
import type { CatalogueList } from 'src/store/catalogue/types'
import { renderWithRouter } from 'src/test/renderWithRouter'

vi.mock('src/store/catalogue/actions', () => ({
  useListCatalogueQuery: vi.fn(),
}))

const meta = (totalItem: number) => ({ page: 1, limit: 10, totalItem, totalPage: totalItem ? 1 : 0, hasPreviousPage: false, hasNextPage: false })
const list = (overrides: Partial<CatalogueList> = {}): CatalogueList => ({
  data: [{ id: 'p1', name: 'Urine Collection Kit', sku: 'UCK-001', price: '24.99', quantity: 450, listingStatus: 'published' }],
  pagingMeta: meta(1),
  lowStock: [],
  ...overrides,
})

const show = (state: Partial<{ data: CatalogueList; error: unknown; isLoading: boolean }>, path = '/catalogue', locationState?: unknown) => {
  vi.mocked(useListCatalogueQuery).mockReturnValue({ refetch: vi.fn(), isFetching: false, ...state } as unknown as ReturnType<typeof useListCatalogueQuery>)
  const router = renderWithRouter(<div />, path, [{ path: '/catalogue', element: <CataloguePage /> }])
  if (locationState) void router.navigate(path, { state: locationState })
  return router
}

describe('CataloguePage', () => {
  beforeEach(() => vi.mocked(useListCatalogueQuery).mockReset())

  it('shows the products with the header action and the note about saving', () => {
    show({ data: list() })

    expect(screen.getByRole('heading', { level: 1, name: 'Catalogue management' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add product/ })).toBeInTheDocument()
    expect(screen.getByText('Urine Collection Kit')).toBeInTheDocument()
    expect(screen.getByText(/update immediately once saved/)).toBeInTheDocument()
  })

  it('shows the low-stock banner above the table', () => {
    show({ data: list({ lowStock: [{ id: 'p1', name: 'Urine Collection Kit', quantity: 5 }] }) })
    expect(screen.getByText('Urine Collection Kit is running low on stock (5 units left)')).toBeInTheDocument()
  })

  it('shows only the empty state, with no filters or header button, for a seller who has listed nothing', () => {
    show({ data: list({ data: [], pagingMeta: meta(0) }) })

    expect(screen.getByText('No products listed yet')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Search products' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Add product/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ Add product' })).toBeInTheDocument()
  })

  it('keeps the filters when a search finds nothing', () => {
    show({ data: list({ data: [], pagingMeta: meta(0) }) }, '/catalogue?search=zzz')

    expect(screen.getByText('No products match')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search products' })).toBeInTheDocument()
  })

  it('explains the Retired tab', () => {
    show({ data: list() }, '/catalogue?status=retired')
    expect(screen.getByText(/Retired products are read-only/)).toBeInTheDocument()
  })

  it('shows a loading outline, and a retry when the catalogue cannot be loaded', () => {
    show({ isLoading: true })
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
  })

  it('offers another try when the catalogue cannot be loaded', async () => {
    show({ error: { status: 0, code: 'NETWORK', message: 'Cannot reach the server.' } })
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
  })
})
