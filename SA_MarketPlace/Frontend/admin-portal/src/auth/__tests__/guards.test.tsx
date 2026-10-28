import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PrivateRoute from 'src/auth/PrivateRoute'
import PublicRoute from 'src/auth/PublicRoute'
import { setupStore } from 'src/store'
import { renderWithRouter } from 'src/test/renderWithRouter'

const signedIn = () => setupStore({ auth: { token: 'a-token', endedBy: null } })
const expired = () => setupStore({ auth: { token: null, endedBy: 'expired' } })
const signedOutByChoice = () => setupStore({ auth: { token: null, endedBy: 'signedOut' } })
const anonymous = () => setupStore({ auth: { token: null, endedBy: null } })

// A private page, a public one, and the pages the guards send people to.
const routes = (guard: 'private' | 'public') => [
  {
    element: guard === 'private' ? <PrivateRoute /> : <PublicRoute />,
    children: [{ path: '/inside', element: <p>inside</p> }],
  },
  { path: '/login', element: <p>the sign-in page</p> },
  { path: '/session-expired', element: <p>the session-expired page</p> },
  { path: '/suppliers', element: <p>the supplier queue</p> },
  { path: '/orders', element: <p>the orders page</p> },
]

describe('PrivateRoute', () => {
  it('shows the page to a signed-in admin', () => {
    renderWithRouter(<div />, '/inside', routes('private'), signedIn())
    expect(screen.getByText('inside')).toBeInTheDocument()
  })

  it('sends someone with no session to sign in, remembering the page', () => {
    const router = renderWithRouter(<div />, '/inside?x=1', routes('private'), anonymous())

    expect(screen.getByText('the sign-in page')).toBeInTheDocument()
    expect(router.state.location.state).toEqual({ from: '/inside?x=1' })
  })

  it('tells an admin whose session expired, remembering the page', () => {
    const router = renderWithRouter(<div />, '/inside', routes('private'), expired())

    expect(screen.getByText('the session-expired page')).toBeInTheDocument()
    expect(router.state.location.state).toEqual({ from: '/inside' })
  })

  it('remembers nothing after the admin chose to sign out', () => {
    const router = renderWithRouter(<div />, '/inside', routes('private'), signedOutByChoice())

    expect(screen.getByText('the sign-in page')).toBeInTheDocument()
    expect(router.state.location.state).toBeNull()
  })
})

describe('PublicRoute', () => {
  it('shows the page to someone with no session', () => {
    renderWithRouter(<div />, '/inside', routes('public'), anonymous())
    expect(screen.getByText('inside')).toBeInTheDocument()
  })

  it('sends a signed-in admin to the supplier queue', () => {
    renderWithRouter(<div />, '/inside', routes('public'), signedIn())
    expect(screen.getByText('the supplier queue')).toBeInTheDocument()
  })
})
