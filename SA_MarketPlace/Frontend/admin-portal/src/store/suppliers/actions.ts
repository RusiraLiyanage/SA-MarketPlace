import { api } from 'src/infra/api'
import type { PaginatedData } from 'src/infra/pagination'
import type {
  ListSuppliersRequest,
  RejectSupplierRequest,
  SupplierApplicationCounts,
  SupplierApplicationDetail,
  SupplierApplicationListItem,
} from 'src/store/suppliers/types'

export const suppliersApi = api.injectEndpoints({
  endpoints: (build) => ({
    // The queue, pending applications first and oldest first (the backend's own order).
    listSuppliers: build.query<PaginatedData<SupplierApplicationListItem>, ListSuppliersRequest>({
      query: (params) => ({ url: '/suppliers', params }),
      providesTags: ['Supplier'],
    }),
    // Its own request because the sidebar badge needs the count on pages that have no list.
    getSupplierSummary: build.query<SupplierApplicationCounts, void>({
      query: () => '/suppliers/summary',
      providesTags: ['Summary'],
    }),
    getSupplierApplication: build.query<SupplierApplicationDetail, string>({
      query: (supplierId) => `/suppliers/${supplierId}`,
      providesTags: ['Supplier'],
    }),
    // A decision changes the queue, the tab counts and the sidebar badge, so all three refetch. The backend emails the
    // applicant, and answers 409 if another admin decided it first.
    approveSupplier: build.mutation<SupplierApplicationDetail, string>({
      query: (supplierId) => ({ url: `/suppliers/${supplierId}/approve`, method: 'POST' }),
      invalidatesTags: ['Supplier', 'Summary'],
    }),
    rejectSupplier: build.mutation<SupplierApplicationDetail, RejectSupplierRequest>({
      query: ({ supplierId, ...body }) => ({ url: `/suppliers/${supplierId}/reject`, method: 'POST', body }),
      invalidatesTags: ['Supplier', 'Summary'],
    }),
  }),
})

export const {
  useListSuppliersQuery,
  useGetSupplierSummaryQuery,
  useGetSupplierApplicationQuery,
  useApproveSupplierMutation,
  useRejectSupplierMutation,
} = suppliersApi
