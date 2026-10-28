import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { CartOutletContext } from 'src/pages/Cart/cartOutletContext'
import RemoveCartItemModal from 'src/pages/Modals/RemoveCartItemModal'
import { renderWithRouter } from 'src/test/renderWithRouter'
import type { CartItem } from 'src/types'

const item: CartItem = {
  productId: 'p1',
  name: 'Saliva Collection Kit',
  price: '12.50',
  quantity: 3,
  lineTotal: '37.50',
  stockStatus: 'in_stock',
  stockOnHand: 10,
  unavailableReason: null,
  supplierProfileId: 'supplier',
  supplierName: 'Supplier',
}

const open = (productId = 'p1', onRemove = vi.fn()) => {
  const context: CartOutletContext = { items: [item], onRemove, onClear: vi.fn() }
  const router = renderWithRouter(<div />, `/cart/remove/${productId}`, [
    { path: '/cart', element: <Outlet context={context} />, children: [{ path: 'remove/:productId', element: <RemoveCartItemModal /> }] },
  ])
  return { router, onRemove }
}

describe('RemoveCartItemModal', () => {
  it('names the item with what it costs, and what removing it does and does not change', () => {
    open()

    expect(screen.getByRole('heading', { level: 2, name: 'Remove Saliva Collection Kit?' })).toBeInTheDocument()
    expect(screen.getByText('3 × $12.50 · $37.50')).toBeInTheDocument()
    expect(screen.getByText('Your order total goes down by $37.50.')).toBeInTheDocument()
    expect(screen.getByText('The rest of your cart is unchanged.')).toBeInTheDocument()
  })

  it('removes it and returns to the cart', async () => {
    const { router, onRemove } = open()

    await userEvent.click(screen.getByRole('button', { name: 'Remove item' }))

    expect(onRemove).toHaveBeenCalledWith('p1')
    expect(router.state.location.pathname).toBe('/cart')
  })

  it('keeps it on Keep item', async () => {
    const { router, onRemove } = open()

    await userEvent.click(screen.getByRole('button', { name: 'Keep item' }))

    expect(onRemove).not.toHaveBeenCalled()
    expect(router.state.location.pathname).toBe('/cart')
  })

  it('says so, and cannot remove anything, when the item is no longer in the cart', () => {
    open('gone')

    expect(screen.getByRole('heading', { level: 2, name: 'This item is no longer in your cart' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove item' })).toBeDisabled()
  })
})
