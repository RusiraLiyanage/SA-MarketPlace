import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { api } from 'src/infra/api'
import { rootReducer, type RootState } from 'src/store/rootReducer'
import { sessionListener } from 'src/store/auth/listeners'

// A function so each test can have its own store; the app uses the one below.
export const setupStore = (preloadedState?: Partial<RootState>) => {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(sessionListener.middleware).concat(api.middleware),
  })
  // Lets `refetchOnFocus` and `refetchOnReconnect` work.
  setupListeners(store.dispatch)
  return store
}

export const store = setupStore()

export type AppStore = ReturnType<typeof setupStore>
export type AppDispatch = AppStore['dispatch']
export type { RootState }
