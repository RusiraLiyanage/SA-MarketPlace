import { Navigate, Outlet, useLocation } from 'react-router'
import { PATHS } from 'src/router/paths'
import { useAppSelector } from 'src/store/hooks'
import { selectIsSignedIn } from 'src/store/auth/selector'

// Only a page's own path counts as somewhere to return to; anything else (such as `//other-site`) is ignored.
const returnPath = (state: unknown): string => {
  const from = (state as { from?: unknown } | null)?.from
  return typeof from === 'string' && /^\/(?!\/)/.test(from) ? from : PATHS.shop
}

// Sign in, register and password pages. Someone who is signed in has no use for them, and signing in is what
// sends them on: back to where they were headed, or to the shop.
const PublicRoute = () => {
  const signedIn = useAppSelector(selectIsSignedIn)
  const { state } = useLocation()

  return signedIn ? <Navigate to={returnPath(state)} replace /> : <Outlet />
}

export default PublicRoute
