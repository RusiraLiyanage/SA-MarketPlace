import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardPage from 'src/pages/Dashboard'
import { useGetDispatchQueueQuery, useGetOverviewQuery } from 'src/store/dashboard/actions'
import type { Overview } from 'src/store/dashboard/types'
import { renderWithRouter } from 'src/test/renderWithRouter'

vi.mock('src/store/dashboard/actions', () => ({ useGetOverviewQuery: vi.fn(), useGetDispatchQueueQuery: vi.fn() }))

const emptyQueue = { data: [], pagingMeta: { page: 1, limit: 10, totalItem: 0, totalPage: 0, hasPreviousPage: false, hasNextPage: false } }

const show = (overview: Partial<{ data: Overview; error: unknown; isLoading: boolean }>) => {
  vi.mocked(useGetOverviewQuery).mockReturnValue({ refetch: vi.fn(), ...overview } as unknown as ReturnType<typeof useGetOverviewQuery>)
  vi.mocked(useGetDispatchQueueQuery).mockReturnValue({ data: emptyQueue, isFetching: false } as unknown as ReturnType<typeof useGetDispatchQueueQuery>)
  renderWithRouter(<DashboardPage />)
}

const overview = (overrides: Partial<Overview> = {}): Overview => ({
  businessName: 'Bindi MedSupply Pty Ltd',
  newOrders: 2,
  dispatchedToday: 3,
  activeListings: 24,
  listingsNeedingAttention: 1,
  ...overrides,
})

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(useGetOverviewQuery).mockReset()
    vi.mocked(useGetDispatchQueueQuery).mockReset()
  })

  it('shows the three numbers with what each counts', () => {
    show({ data: overview() })

    expect(screen.getByRole('heading', { level: 1, name: 'Supplier overview' })).toBeInTheDocument()
    expect(screen.getByText('New orders').parentElement).toHaveTextContent('2 orders')
    expect(screen.getByText('Dispatched today').parentElement).toHaveTextContent('3 orders')
    expect(screen.getByText('Active listings').parentElement).toHaveTextContent('24 products')
    expect(screen.getByText('Requiring action')).toBeInTheDocument()
    expect(screen.getByText('1 product needs attention')).toBeInTheDocument()
    expect(screen.queryByLabelText('Welcome')).not.toBeInTheDocument()
  })

  it('says "need" for several products and singular units for one', () => {
    show({ data: overview({ newOrders: 1, dispatchedToday: 1, activeListings: 1, listingsNeedingAttention: 3 }) })

    expect(screen.getByText('New orders').parentElement).toHaveTextContent('1 order')
    expect(screen.getByText('Active listings').parentElement).toHaveTextContent('1 product')
    expect(screen.getByText('3 products need attention')).toBeInTheDocument()
  })

  it('says nothing needs attention when stock is fine', () => {
    show({ data: overview({ listingsNeedingAttention: 0 }) })
    expect(screen.getByText('None need attention')).toBeInTheDocument()
  })

  it('welcomes a seller with nothing yet, and draws the cards quietly', () => {
    show({ data: overview({ newOrders: 0, dispatchedToday: 0, activeListings: 0, listingsNeedingAttention: 0 }) })

    expect(screen.getByText('Welcome to the marketplace, Bindi MedSupply Pty Ltd')).toBeInTheDocument()
    expect(screen.getAllByText('Nothing yet')).toHaveLength(2)
    expect(screen.getByText('Add your first product')).toBeInTheDocument()
    expect(screen.getByText('No orders to dispatch right now')).toBeInTheDocument()
    expect(screen.queryByText('ORDER #')).not.toBeInTheDocument()
  })

  it('shows a loading outline, then nothing wrong', () => {
    show({ isLoading: true })
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
  })

  it('offers another try when the numbers cannot be loaded', () => {
    show({ error: { status: 0, code: 'NETWORK', message: 'Cannot reach the server.' } })
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
