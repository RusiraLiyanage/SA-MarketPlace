import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OrdersPage from 'src/pages/Orders'
import { useListOrdersQuery } from 'src/store/orders/actions'
import type { AdminOrderListItem } from 'src/store/orders/types'
import { order } from 'src/test/orderFixture'
import { renderWithRouter } from 'src/test/renderWithRouter'

vi.mock('src/store/orders/actions', () => ({
  useListOrdersQuery: vi.fn(),
  useExportOrdersMutation: () => [vi.fn(), { isLoading: false }],
}))

const refetch = vi.fn()
const list = (data: AdminOrderListItem[]) => ({
  data,
  pagingMeta: { page: 1, limit: 10, totalItem: data.length, totalPage: data.length ? 1 : 0, hasPreviousPage: false, hasNextPage: false },
})
const listing = (result: object) => vi.mocked(useListOrdersQuery).mockReturnValue({ refetch, ...result } as unknown as ReturnType<typeof useListOrdersQuery>)
const show = (path = '/orders') => renderWithRouter(<OrdersPage />, path)

describe('OrdersPage', () => {
  beforeEach(() => {
    refetch.mockReset()
    vi.mocked(useListOrdersQuery).mockReset()
  })

  it('shows the orders, newest first, with the export and the read-only subtitle', () => {
    listing({ data: list([order()]) })
    show()

    expect(screen.getByRole('heading', { level: 1, name: 'All orders' })).toBeInTheDocument()
    expect(screen.getByText('Read-only oversight of every marketplace and Collection Manager order')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Export CSV/ })).toBeInTheDocument()
    expect(screen.getByText('ORD-2026-00126')).toBeInTheDocument()
    expect(useListOrdersQuery).toHaveBeenCalledWith({
      payment: undefined,
      fulfilment: undefined,
      search: undefined,
      orderField: 'placed_at',
      order: 'DESC',
      page: 1,
      limit: 10,
    })
  })

  it('reads the filters and the sort from the address', () => {
    listing({ data: list([]) })
    show('/orders?payment=paid&fulfilment=picking&search=mining&orderField=total&order=ASC&page=2&limit=20')

    expect(useListOrdersQuery).toHaveBeenCalledWith({ payment: 'paid', fulfilment: 'picking', search: 'mining', orderField: 'total', order: 'ASC', page: 2, limit: 20 })
  })

  it('goes back to page 1 and the address when a filter is chosen', async () => {
    listing({ data: list([order()]) })
    const router = show('/orders?page=3')

    await userEvent.click(screen.getByRole('combobox', { name: 'Fulfilment stage' }))
    await userEvent.click(await screen.findByTitle('Delivered'))

    expect(router.state.location.search).toBe('?fulfilment=delivered')
  })

  it('clears a search that found nothing', async () => {
    listing({ data: list([]) })
    const router = show('/orders?search=zzz&payment=failed')

    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

    expect(router.state.location.search).toBe('')
  })

  it('says there are no orders yet when there are none and nothing is filtered', () => {
    listing({ data: list([]) })
    show()

    expect(screen.getByText('No orders yet')).toBeInTheDocument()
  })

  it('shows no table while it loads', () => {
    listing({ isLoading: true })
    show()

    expect(screen.queryByText('ORD-2026-00126')).not.toBeInTheDocument()
  })

  it('offers a retry when the orders could not be loaded', async () => {
    listing({ error: { status: 500, code: 'UNKNOWN', message: 'Something broke' } })
    show()

    expect(screen.getByText('We could not load the orders')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalled()
  })
})
