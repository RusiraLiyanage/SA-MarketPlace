import type { RootState } from 'src/store/rootReducer'

const selectToken = (state: RootState) => state.auth.token

const selectIsSignedIn = (state: RootState) => state.auth.token !== null

/** Why there is no session any more; null on a fresh visit. */
const selectSessionEnd = (state: RootState) => state.auth.endedBy

export { selectIsSignedIn, selectSessionEnd, selectToken }
