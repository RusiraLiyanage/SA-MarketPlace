import type { Dispatch } from '@reduxjs/toolkit'
import { api } from 'src/infra/api'
import type {
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  TokenResponse,
} from 'src/store/auth/types'
import { signedIn, signedOut } from 'src/store/auth/slice'

// Starts the session from the token in the response; false when the request failed, which the mutation reports itself.
export const startSession = async (dispatch: Dispatch, queryFulfilled: Promise<{ data: TokenResponse }>) => {
  const { data } = await queryFulfilled.catch(() => ({ data: undefined }))
  if (data) dispatch(signedIn(data.access_token))
  return data !== undefined
}

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    // Signing in and registering both answer with a token, which starts the session.
    login: build.mutation<TokenResponse, LoginRequest>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        await startSession(dispatch, queryFulfilled)
      },
    }),
    register: build.mutation<TokenResponse, RegisterRequest>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        await startSession(dispatch, queryFulfilled)
      },
    }),
    // Ends every token the account has (backend ADR 0018). The seller is signed out here even if the call fails,
    // for example because the token had already expired.
    logout: build.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        await queryFulfilled.catch(() => undefined)
        dispatch(signedOut())
      },
    }),
    forgotPassword: build.mutation<void, ForgotPasswordRequest>({
      query: (body) => ({ url: '/auth/forgot-password', method: 'POST', body }),
    }),
    resetPassword: build.mutation<void, ResetPasswordRequest>({
      query: (body) => ({ url: '/auth/reset-password', method: 'POST', body }),
    }),
  }),
})

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = authApi
