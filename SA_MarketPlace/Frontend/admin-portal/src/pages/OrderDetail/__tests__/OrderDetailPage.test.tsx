import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OrderDetailPage from 'src/pages/OrderDetail'
import { useGetOrderQuery } from 'src/store/orders/actions'
import { orderDetail } from 'src/test/orderDetailFixture'
import { renderWithRouter } from 'src/test/renderWithRouter'

vi.mock('src/store/orders/actions', () => ({
  useGetOrderQuery: vi.fn(),
  useDownloadInvoiceMutation: () => [vi.fn(), { isLoading: false }],
}))

const refetch = vi.fn()
const result = (value: object) => vi.mocked(useGetOrderQuery).mockReturnValue({ refetch, ...value } as unknown as ReturnType<typeof useGetOrderQuery>)
const show = () =>
  renderWithRouter(<div />, '/orders/ORD-2026-00125', [
    { path: '/orders/:orderNumber', element: <OrderDetailPage /> },
    { path: '/orders', element: <p>the orders list</p> },
  ])

describe('OrderDetailPage', () => {
  beforeEach(() => {
    refetch.mockReset()
    vi.mocked(useGetOrderQuery).mockReset()
  })

  it('asks the backend for the order in the address', () => {
    result({ currentData: orderDetail() })
    show()

    expect(useGetOrderQuery).toHaveBeenCalledWith('ORD-2026-00125')
    // The customer is named in the summary and again at the top of the delivery address.
    expect(screen.getAllByText('Mining Co Pty Ltd')).toHaveLength(2)
  })

  it('shows the title but no details while it loads', () => {
    result({ isFetching: true })
    show()

    expect(screen.getByRole('heading', { level: 1, name: 'Order ORD-2026-00125' })).toBeInTheDocument()
    expect(screen.queryByText('Items ordered')).not.toBeInTheDocument()
  })

  it('says it was not found, with a way back, for a missing order', async () => {
    result({ error: { status: 404, code: 'ECB404', message: 'Order not found' } })
    const router = show()

    expect(screen.getByText('Order not found')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Back to orders' }))
    expect(router.state.location.pathname).toBe('/orders')
  })

  it('offers a retry for any other failure', async () => {
    result({ error: { status: 500, code: 'UNKNOWN', message: 'Something broke' } })
    show()

    expect(screen.getByText('We could not load this order')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalled()
  })

  it("never shows the previous order's details for a link that failed", () => {
    // What RTK Query hands back after moving to an order that does not exist: the old result in `data`, the new failure in `error`.
    result({ data: orderDetail(), error: { status: 404, code: 'ECB404', message: 'Order not found' } })
    show()

    expect(screen.getByText('Order not found')).toBeInTheDocument()
    expect(screen.queryAllByText('Mining Co Pty Ltd')).toHaveLength(0)
  })
})
