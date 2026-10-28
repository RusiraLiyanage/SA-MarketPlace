import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { readStoredToken } from 'src/store/auth/storage'
import type { AuthState } from 'src/store/auth/types'

// Client-side state only: who is signed in. Everything the server owns (profile, cart, orders) lives in the API cache.
const authSlice = createSlice({
  name: 'auth',
  // A function, so each store reads storage afresh instead of once at import.
  initialState: (): AuthState => ({ token: readStoredToken(), endedBy: null }),
  reducers: {
    signedIn: (_state, action: PayloadAction<string>): AuthState => ({ token: action.payload, endedBy: null }),
    signedOut: (): AuthState => ({ token: null, endedBy: 'signedOut' }),
    sessionExpired: (): AuthState => ({ token: null, endedBy: 'expired' }),
  },
})

export const { signedIn, signedOut, sessionExpired } = authSlice.actions
export default authSlice
