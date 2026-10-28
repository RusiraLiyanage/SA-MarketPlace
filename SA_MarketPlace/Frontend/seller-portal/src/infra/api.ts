import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQuery } from 'src/infra/http'

// The single API slice. Each feature adds its own endpoints with `api.injectEndpoints` in `src/store/<feature>/api.ts`,
// so this file never grows. A mutation lists the tags it changes, and the queries that provide them refetch by themselves.
export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Application', 'Order', 'Overview', 'Product', 'Profile'],
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: () => ({}),
})
