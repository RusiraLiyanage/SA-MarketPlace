import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet } from 'react-router'
import { describe, expect, it } from 'vitest'
import PaymentDeclinedModal from 'src/pages/Modals/PaymentDeclinedModal'
import { renderWithRouter } from 'src/test/renderWithRouter'

const open = () =>
  renderWithRouter(<div />, '/checkout/payment/declined', [
    { path: '/checkout/payment', element: <Outlet />, children: [{ path: 'declined', element: <PaymentDeclinedModal /> }] },
  ])

describe('PaymentDeclinedModal', () => {
  it('says what happened and what was kept', () => {
    open()

    expect(screen.getByRole('heading', { level: 2, name: 'Your card was declined' })).toBeInTheDocument()
    expect(screen.getByText('No payment was taken.')).toBeInTheDocument()
    expect(screen.getByText('No order was placed.')).toBeInTheDocument()
    expect(screen.getByText('Your cart is kept.')).toBeInTheDocument()
    expect(screen.getByText('Your delivery details are kept.')).toBeInTheDocument()
  })

  it('goes back to the payment form on Try another card', async () => {
    const router = open()

    await userEvent.click(screen.getByRole('button', { name: 'Try another card' }))

    expect(router.state.location.pathname).toBe('/checkout/payment')
  })
})
