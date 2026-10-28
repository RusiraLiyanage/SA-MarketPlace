import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CancelOrderModal from 'src/pages/Modals/CancelOrderModal'
import { useGetOrderQuery } from 'src/store/orders/actions'
import { renderWithRouter } from 'src/test/renderWithRouter'

const cancelOrder = vi.fn()
vi.mock('src/store/orders/actions', () => ({
  useGetOrderQuery: vi.fn(),
  useCancelOrderMutation: () => [(arg: unknown) => ({ unwrap: () => cancelOrder(arg) }), { isLoading: false }],
}))

const open = (canDispatch = true) => {
  vi.mocked(useGetOrderQuery).mockReturnValue({ data: { organisationName: 'WorkSafe Pty Ltd', canDispatch, items: [{}, {}, {}], placedAt: '2026-06-17T02:00:00.000Z' } } as unknown as ReturnType<typeof useGetOrderQuery>)
  return renderWithRouter(<div />, '/orders/ORD-2026-00126/cancel', [
    { path: '/orders/:orderNumber', element: <Outlet />, children: [{ path: 'cancel', element: <CancelOrderModal /> }] },
  ])
}

describe('CancelOrderModal', () => {
  beforeEach(() => {
    cancelOrder.mockReset()
    vi.mocked(useGetOrderQuery).mockReset()
  })

  it('names the order and who it is for, what changes and what stays, with the warning that it cannot be undone', () => {
    open()

    expect(screen.getByRole('heading', { level: 2, name: 'Cancel order ORD-2026-00126?' })).toBeInTheDocument()
    expect(screen.getByText('WorkSafe Pty Ltd · 3 items · placed 17 Jun 2026')).toBeInTheDocument()
    expect(screen.getByText('WorkSafe Pty Ltd is emailed.')).toBeInTheDocument()
    expect(screen.getByText('The units go back into your stock.')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
  })

  it('starts on "Out of stock" and sends it, without notes, then returns to the order', async () => {
    cancelOrder.mockResolvedValue({})
    const router = open()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel order' }))

    await vi.waitFor(() => expect(cancelOrder).toHaveBeenCalledWith({ orderNumber: 'ORD-2026-00126', reason: 'out_of_stock', notes: undefined }))
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/orders/ORD-2026-00126'))
  })

  it('needs notes when the reason is "Other"', async () => {
    cancelOrder.mockResolvedValue({})
    open()

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(await screen.findByTitle('Other'))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel order' }))

    expect(await screen.findByText('Tell the buyer why')).toBeInTheDocument()
    expect(cancelOrder).not.toHaveBeenCalled()

    await userEvent.type(screen.getByRole('textbox'), '  Supplier recall ')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel order' }))

    await vi.waitFor(() => expect(cancelOrder).toHaveBeenCalledWith({ orderNumber: 'ORD-2026-00126', reason: 'other', notes: 'Supplier recall' }))
  })

  it('leaves the order alone on "Keep order"', async () => {
    const router = open()

    await userEvent.click(screen.getByRole('button', { name: 'Keep order' }))

    expect(cancelOrder).not.toHaveBeenCalled()
    expect(router.state.location.pathname).toBe('/orders/ORD-2026-00126')
  })

  it('cannot be confirmed for an order that can no longer be cancelled', () => {
    open(false)
    expect(screen.getByRole('button', { name: 'Cancel order' })).toBeDisabled()
  })

  it('stays open and shows the backend\'s reason when the cancel is refused', async () => {
    cancelOrder.mockImplementation(() => Promise.reject({ status: 409, code: 'ECB409', message: 'This order can no longer be cancelled' }))
    const router = open()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel order' }))

    expect(await screen.findByText('This order can no longer be cancelled')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/orders/ORD-2026-00126/cancel')
  })
})
