import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import SessionExpiredModal from 'src/pages/Modals/SessionExpiredModal'
import { renderWithRouter } from 'src/test/renderWithRouter'

describe('SessionExpiredModal', () => {
  it('can only be left by signing in again', async () => {
    const router = renderWithRouter(<SessionExpiredModal />, '/session-expired')

    expect(screen.getByRole('heading', { level: 2, name: 'Your session has expired' })).toBeInTheDocument()
    expect(screen.getByText('Your cart and orders are safe.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(router.state.location.pathname).toBe('/login')
  })

  it('does not go away on Escape', async () => {
    const router = renderWithRouter(<SessionExpiredModal />, '/session-expired')

    await userEvent.keyboard('{Escape}')

    expect(router.state.location.pathname).toBe('/session-expired')
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })
})
