import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SignOutConfirmModal from 'src/pages/Modals/SignOutConfirmModal'
import { renderWithRouter } from 'src/test/renderWithRouter'

const logout = vi.fn()
vi.mock('src/store/auth/actions', () => ({
  useLogoutMutation: () => [logout, { isLoading: false }],
}))

const open = () =>
  renderWithRouter(<div />, '/profile/sign-out', [
    { path: '/profile', element: <Outlet />, children: [{ path: 'sign-out', element: <SignOutConfirmModal /> }] },
  ])

describe('SignOutConfirmModal', () => {
  beforeEach(() => logout.mockReset())

  it('says what signing out does and what it leaves alone', () => {
    open()

    expect(screen.getByRole('heading', { level: 2, name: 'Sign out?' })).toBeInTheDocument()
    expect(screen.getByText('You are signed out everywhere.')).toBeInTheDocument()
    expect(screen.getByText('Your cart and orders are kept.')).toBeInTheDocument()
  })

  it('signs out on Sign out', async () => {
    open()

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(logout).toHaveBeenCalledOnce()
  })

  it('stays signed in on Stay signed in', async () => {
    const router = open()

    await userEvent.click(screen.getByRole('button', { name: 'Stay signed in' }))

    expect(logout).not.toHaveBeenCalled()
    expect(router.state.location.pathname).toBe('/profile')
  })
})
