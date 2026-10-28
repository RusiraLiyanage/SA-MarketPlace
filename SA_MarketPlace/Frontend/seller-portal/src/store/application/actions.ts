import { api } from 'src/infra/api'
import type { Application, ApplicationDetails, ResubmitRequest } from 'src/store/application/types'

export const applicationApi = api.injectEndpoints({
  endpoints: (build) => ({
    getApplication: build.query<Application, void>({
      query: () => '/application',
      providesTags: ['Application'],
    }),
    // Rejected sellers only: the form's starting values.
    getApplicationDetails: build.query<ApplicationDetails, void>({
      query: () => '/application/details',
    }),
    // "Proceed to dashboard": the notice never shows again. Answers 204.
    acknowledgeApplication: build.mutation<void, void>({
      query: () => ({ url: '/application/acknowledge', method: 'POST' }),
      invalidatesTags: ['Application'],
    }),
    // "Update and resubmit": goes back to pending_review.
    resubmitApplication: build.mutation<unknown, ResubmitRequest>({
      query: (body) => ({ url: '/application', method: 'PUT', body }),
      invalidatesTags: ['Application'],
    }),
  }),
})

export const {
  useGetApplicationQuery,
  useGetApplicationDetailsQuery,
  useAcknowledgeApplicationMutation,
  useResubmitApplicationMutation,
} = applicationApi
