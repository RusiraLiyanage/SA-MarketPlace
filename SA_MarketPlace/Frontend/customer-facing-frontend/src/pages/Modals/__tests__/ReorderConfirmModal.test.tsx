import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReorderConfirmModal from 'src/pages/Modals/ReorderConfirmModal'
import { useGetOrderQuery } from 'src/store/orders/actions'
import { renderWithRouter } from 'src/test/renderWithRouter'

const reorder = vi.fn()
const backend = vi.hoisted(() => ({ result: undefined as unknown }))
vi.mock('src/store/orders/actions', () => ({
  useGetOrderQuery: vi.fn(),
  useReorderMutation: () => [(orderNumber: string) => ({ unwrap: () => reorder(orderNumber) }), { data: backend.result, isLoading: false }],
}))

const order = { orderNumber: 'ORD-2026-00126', placedAt: '2026-06-17T02:00:00.000Z', items: [{ productName: 'Saliva Kit', quantity: 2 }, { productName: 'Gloves', quantity: 1 }] }
const line = (productName: string, added: boolean, reason: string | null = null) => ({ productId: productName, productName, requestedQuantity: 1, added, reason })

const open = (data: unknown = order, error: unknown = undefined) => {
  vi.mocked(useGetOrderQuery).mockReturnValue({ data, error, isLoading: false } as unknown as ReturnType<typeof useGetOrderQuery>)
  return renderWithRouter(<div />, '/orders/reorder/ORD-2026-00126', [
    { path: '/orders', element: <Outlet />, children: [{ path: 'reorder/:orderNumber', element: <ReorderConfirmModal /> }] },
    { path: '/cart', element: <p>the cart</p> },
  ])
}

describe('ReorderConfirmModal', () => {
  beforeEach(() => {
    reorder.mockReset()
    backend.result = undefined
  })

  it('says what reordering does before it does it, and lists the items', () => {
    open()

    expect(screen.getByRole('heading', { level: 2, name: 'Reorder ORD-2026-00126?' })).toBeInTheDocument()
    expect(screen.getByText('2 items · placed 17 Jun 2026')).toBeInTheDocument()
    expect(screen.getByText('Nothing is ordered or charged until you check out.')).toBeInTheDocument()
    expect(screen.getByText('The original order is not changed.')).toBeInTheDocument()
    expect(screen.getByText('Saliva Kit × 2')).toBeInTheDocument()
    expect(reorder).not.toHaveBeenCalled()
  })

  it('adds the items to the cart on Add to cart', async () => {
    reorder.mockResolvedValue({})
    open()

    await userEvent.click(screen.getByRole('button', { name: 'Add to cart' }))

    expect(reorder).toHaveBeenCalledWith('ORD-2026-00126')
  })

  it('leaves everything alone on Not now', async () => {
    const router = open()

    await userEvent.click(screen.getByRole('button', { name: 'Not now' }))

    expect(reorder).not.toHaveBeenCalled()
    expect(router.state.location.pathname).toBe('/orders')
  })

  it('says the order could not be found, with only a Close button', () => {
    open(null, { status: 404, code: 'ECB404', message: 'Not found' })

    expect(screen.getByRole('heading', { level: 2, name: 'We couldn’t find this order' })).toBeInTheDocument()
    expect(screen.getByText('This order could not be found.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add to cart' })).not.toBeInTheDocument()
  })

  describe('after reordering', () => {
    it('says everything was added, and goes to the cart', async () => {
      backend.result = { lines: [line('Saliva Kit', true), line('Gloves', true)] }
      const router = open()

      expect(screen.getByRole('heading', { level: 2, name: '2 items added to your cart' })).toBeInTheDocument()
      expect(screen.getByText('Check the prices in your cart before you check out.')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Go to cart' }))

      expect(router.state.location.pathname).toBe('/cart')
    })

    it('says which items were left out, and why', () => {
      backend.result = { lines: [line('Saliva Kit', true), line('Gloves', false, 'Out of stock')] }
      open()

      expect(screen.getByRole('heading', { level: 2, name: '1 of 2 items added to your cart' })).toBeInTheDocument()
      expect(screen.getByText('Out of stock')).toBeInTheDocument()
    })

    it('says nothing was added, and offers no cart', () => {
      backend.result = { lines: [line('Gloves', false, 'No longer available')] }
      open()

      expect(screen.getByRole('heading', { level: 2, name: 'None of the items could be added' })).toBeInTheDocument()
      expect(screen.getByText('No longer available')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Go to cart' })).not.toBeInTheDocument()
    })
  })
})
