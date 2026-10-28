import { api } from 'src/infra/api'
import { startSession } from 'src/store/auth/actions'
import type { TokenResponse } from 'src/store/auth/types'
import type { ChangePasswordRequest, MyAdminProfile, UpdateProfileRequest } from 'src/store/profile/types'

export const profileApi = api.injectEndpoints({
  endpoints: (build) => ({
    getProfile: build.query<MyAdminProfile, void>({
      query: () => '/auth/profile',
      providesTags: ['Profile'],
    }),
    // The answer is the fresh profile, so it replaces the cached one instead of causing another request.
    updateProfile: build.mutation<MyAdminProfile, UpdateProfileRequest>({
      query: (body) => ({ url: '/auth/profile', method: 'PATCH', body }),
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        const { data } = await queryFulfilled.catch(() => ({ data: undefined }))
        if (data) dispatch(profileApi.util.updateQueryData('getProfile', undefined, () => data))
      },
    }),
    // Every other device is signed out, and this session gets a fresh token back (backend ADR 0030). The profile is
    // refetched only after the new token is in place, since the old one no longer works.
    changePassword: build.mutation<TokenResponse, ChangePasswordRequest>({
      query: (body) => ({ url: '/auth/change-password', method: 'POST', body }),
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        if (await startSession(dispatch, queryFulfilled)) dispatch(profileApi.util.invalidateTags(['Profile']))
      },
    }),
  }),
})

export const { useGetProfileQuery, useUpdateProfileMutation, useChangePasswordMutation } = profileApi
