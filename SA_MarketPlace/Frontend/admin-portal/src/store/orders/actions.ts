import { api } from 'src/infra/api'
import type { PaginatedData } from 'src/infra/pagination'
import type { AdminOrderDetail, AdminOrderListItem, ListOrdersRequest, OrdersFilter } from 'src/store/orders/types'
import { filenameFrom, saveFile } from 'src/utils/download'

export const ordersApi = api.injectEndpoints({
  endpoints: (build) => ({
    listOrders: build.query<PaginatedData<AdminOrderListItem>, ListOrdersRequest>({
      query: (params) => ({ url: '/orders', params }),
      providesTags: ['Order'],
    }),
    getOrder: build.query<AdminOrderDetail, string>({
      query: (orderNumber) => `/orders/${orderNumber}`,
      providesTags: ['Order'],
    }),
    // The table's filters and sort with no paging, so the file holds every match. It is a CSV, saved as a download as it arrives; the file
    // never enters the store. Over the backend's row limit it refuses before sending anything, with a reason to show.
    exportOrders: build.mutation<string, OrdersFilter>({
      queryFn: async (params, _api, _extra, baseQuery) => {
        const result = await baseQuery({
          url: '/orders/export',
          params,
          // The file when it comes; the backend's JSON error body when it does not, so the reason can be shown.
          responseHandler: (response) => (response.ok ? response.blob() : response.json()),
        })
        if (result.error) return { error: result.error }

        // The base query hands back the fetch response in `meta`, though this callback sees its type as empty.
        const response = (result.meta as { response?: Response } | undefined)?.response
        const filename = filenameFrom(response?.headers.get('Content-Disposition'), 'orders.csv')
        saveFile(result.data as Blob, filename)
        return { data: filename }
      },
    }),
    // The invoice is a PDF, saved as a download as it arrives; the file itself never enters the store. It exists only once the order
    // has dispatched, and until then the backend refuses with a reason.
    downloadInvoice: build.mutation<void, string>({
      queryFn: async (orderNumber, _api, _extra, baseQuery) => {
        const result = await baseQuery({
          url: `/orders/${orderNumber}/invoice`,
          responseHandler: (response) => (response.ok ? response.blob() : response.json()),
        })
        if (result.error) return { error: result.error }

        const response = (result.meta as { response?: Response } | undefined)?.response
        saveFile(result.data as Blob, filenameFrom(response?.headers.get('Content-Disposition'), `${orderNumber}-invoice.pdf`))
        return { data: undefined }
      },
    }),
  }),
})

export const { useListOrdersQuery, useGetOrderQuery, useExportOrdersMutation, useDownloadInvoiceMutation } = ordersApi
