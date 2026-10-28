import { fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { ERROR_CODE, type ApiError, type ErrorCode } from 'src/infra/errors'
import type { RootState } from 'src/store/rootReducer'
import { sessionExpired } from 'src/store/auth/slice'
import { selectToken } from 'src/store/auth/selector'

const DEFAULT_API_URL = 'http://localhost:8001/api/customer/v1'
export const API_URL = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

// Product images are served by the same backend, outside the API's version prefix: `products/<name>.jpg` is at `/media/...`.
export const mediaUrl = (path: string) => `${new URL(API_URL).origin}/media/${path}`

const REQUEST_TIMEOUT_MS = 15_000

const knownCodes: readonly string[] = Object.values(ERROR_CODE)

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  timeout: REQUEST_TIMEOUT_MS,
  prepareHeaders: (headers, { getState }) => {
    const token = selectToken(getState() as RootState)
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return headers
  },
})

// The backend answers an error with `{ data: {}, error: 'ECB404', message }`.
const toApiError = (error: FetchBaseQueryError): ApiError => {
  if (error.status === 'FETCH_ERROR' || error.status === 'TIMEOUT_ERROR') {
    return { status: 0, code: ERROR_CODE.network, message: 'Cannot reach the server. Check your connection and try again.' }
  }
  if (error.status === 'PARSING_ERROR' || error.status === 'CUSTOM_ERROR') {
    return { status: error.status === 'PARSING_ERROR' ? error.originalStatus : 0, code: ERROR_CODE.unknown, message: 'The server sent a response we could not read.' }
  }

  const body = error.data as { error?: string; message?: string } | undefined
  const code: ErrorCode = body?.error && knownCodes.includes(body.error) ? (body.error as ErrorCode) : ERROR_CODE.unknown
  return { status: error.status, code, message: body?.message ?? 'Something went wrong. Please try again.' }
}

// The one place requests are sent: adds the token, turns every failure into an ApiError, and ends the session when the
// backend rejects a token we sent (a 401 without a token is just a failed sign-in).
export const baseQuery: BaseQueryFn<string | FetchArgs, unknown, ApiError> = async (args, api, extraOptions) => {
  const hadToken = selectToken(api.getState() as RootState) !== null
  const result = await rawBaseQuery(args, api, extraOptions)
  if (!result.error) return result

  const apiError = toApiError(result.error)
  if (hadToken && apiError.status === 401) api.dispatch(sessionExpired())
  return { error: apiError }
}
