import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import ClearCartModal from 'src/pages/Modals/ClearCartModal'
import type { CartOutletContext } from 'src/pages/Cart/cartOutletContext'
import { renderWithRouter } from 'src/test/renderWithRouter'
import type { CartItem } from 'src/types'

const line = (productId: string): CartItem => ({
  productId,
  name: `Product ${productId}`,
  price: '10.00',
  quantity: 1,
  lineTotal: '10.00',
  stockStatus: 'in_stock',
  stockOnHand: 5,
  unavailableReason: null,
  supplierProfileId: 'supplier',
  supplierName: 'Supplier',
})

// The cart page, as far as the pop-up is concerned: it hands the lines and the actions down through the outlet.
const open = (items: CartItem[], onClear = vi.fn()) => {
  const context: CartOutletContext = { items, onRemove: vi.fn(), onClear }
  const router = renderWithRouter(<div />, '/cart/clear', [
    {
      path: '/cart',
      element: <Outlet context={context} />,
      children: [{ path: 'clear', element: <ClearCartModal /> }],
    },
  ])
  return { router, onClear }
}

describe('ClearCartModal', () => {
  it('asks first, then empties the cart and returns to it', async () => {
    const { router, onClear } = open([line('a'), line('b')])

    expect(screen.getByRole('heading', { level: 2, name: 'Clear your cart?' })).toBeInTheDocument()
    expect(screen.getByText('2 products · $20.00')).toBeInTheDocument()
    expect(screen.getByText('All 2 products come out of your cart.')).toBeInTheDocument()
    expect(screen.getByText('The products stay on the marketplace.')).toBeInTheDocument()
    expect(onClear).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Clear cart' }))

    expect(onClear).toHaveBeenCalledOnce()
    expect(router.state.location.pathname).toBe('/cart')
  })

  it('leaves the cart alone when cancelled', async () => {
    const { router, onClear } = open([line('a')])

    await userEvent.click(screen.getByRole('button', { name: 'Keep my cart' }))

    expect(onClear).not.toHaveBeenCalled()
    expect(router.state.location.pathname).toBe('/cart')
  })

  it('says so, and cannot be confirmed, when the cart is already empty', () => {
    open([])

    expect(screen.getByRole('heading', { level: 2, name: 'Your cart is already empty' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear cart' })).toBeDisabled()
  })
})
