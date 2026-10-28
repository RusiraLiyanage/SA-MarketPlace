import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit'
import { api } from 'src/infra/api'
import type { RootState } from 'src/store/rootReducer'
import { sessionExpired, signedIn, signedOut } from 'src/store/auth/slice'
import { selectToken } from 'src/store/auth/selector'
import { writeStoredToken } from 'src/store/auth/storage'

export const sessionListener = createListenerMiddleware()

// Keep sessionStorage in step with the token.
sessionListener.startListening({
  matcher: isAnyOf(signedIn, signedOut, sessionExpired),
  effect: (_action, { getState }) => {
    writeStoredToken(selectToken(getState() as RootState))
  },
})

// Whoever signs out, by choice or because the token expired, leaves nothing of the account in the cache: the next
// person on this browser must never see its orders, listings or profile.
sessionListener.startListening({
  matcher: isAnyOf(signedOut, sessionExpired),
  effect: (_action, { dispatch }) => {
    dispatch(api.util.resetApiState())
  },
})
