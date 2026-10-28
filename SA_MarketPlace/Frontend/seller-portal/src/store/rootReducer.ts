import { combineSlices } from '@reduxjs/toolkit'
import { api } from 'src/infra/api'
import authSlice from 'src/store/auth/slice'

// Add a feature's client-state slice here when it has one (server data lives in `api`, not in a slice).
export const rootReducer = combineSlices(authSlice, api)

export type RootState = ReturnType<typeof rootReducer>
