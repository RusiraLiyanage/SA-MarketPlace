import { Navigate, Outlet, useLocation } from 'react-router'
import { PATHS } from 'src/router/paths'
import { useAppSelector } from 'src/store/hooks'
import { selectIsSignedIn, selectSessionEnd } from 'src/store/auth/selector'

// Everything after sign-in. Without a session the seller is sent to sign in and, except after choosing to sign out,
// brought back to this page afterwards. An expired session is told so first.
const PrivateRoute = () => {
  const signedIn = useAppSelector(selectIsSignedIn)
  const endedBy = useAppSelector(selectSessionEnd)
  const { pathname, search } = useLocation()

  if (signedIn) return <Outlet />

  const state = endedBy === 'signedOut' ? undefined : { from: `${pathname}${search}` }
  return <Navigate to={endedBy === 'expired' ? PATHS.sessionExpired : PATHS.login} state={state} replace />
}

export default PrivateRoute
