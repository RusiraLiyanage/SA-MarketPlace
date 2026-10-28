import { api } from 'src/infra/api'
import type { PaginatedData } from 'src/infra/pagination'
import type { DispatchQueueRequest, DispatchQueueRow, Overview } from 'src/store/dashboard/types'

export const dashboardApi = api.injectEndpoints({
  endpoints: (build) => ({
    // Read by the dashboard and by the sidebar (business name, Catalogue badge). Anything that changes an order or a
    // listing invalidates `Overview`, so the numbers follow.
    getOverview: build.query<Overview, void>({
      query: () => '/dashboard/overview',
      providesTags: ['Overview'],
    }),
    // Oldest first, which is the order closest to breaching its SLA.
    getDispatchQueue: build.query<PaginatedData<DispatchQueueRow>, DispatchQueueRequest>({
      query: (params) => ({ url: '/dashboard/orders-requiring-dispatch', params }),
      providesTags: ['Overview', 'Order'],
    }),
  }),
})

export const { useGetOverviewQuery, useGetDispatchQueueQuery } = dashboardApi
