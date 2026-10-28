import { api } from 'src/infra/api'
import type { PaginatedData } from 'src/infra/pagination'
import type { CancelRequest, DispatchRequest, ListOrdersRequest, OrderDetail, OrderListItem } from 'src/store/orders/types'
import { filenameFrom, saveFile } from 'src/utils/download'

export const ordersApi = api.injectEndpoints({
  endpoints: (build) => ({
    listOrders: build.query<PaginatedData<OrderListItem>, ListOrdersRequest>({
      query: (params) => ({ url: '/orders', params }),
      providesTags: ['Order'],
    }),
    getOrder: build.query<OrderDetail, string>({
      query: (orderNumber) => `/orders/${orderNumber}`,
      providesTags: ['Order'],
    }),
    // Dispatching or cancelling moves the order out of the dispatch queue, so the dashboard's numbers and the sidebar follow. A
    // cancel also gives the units back to the products, so their stock changes too.
    dispatchOrder: build.mutation<unknown, DispatchRequest>({
      query: ({ orderNumber, ...body }) => ({ url: `/orders/${orderNumber}/dispatch`, method: 'POST', body }),
      invalidatesTags: ['Order', 'Overview'],
    }),
    cancelOrder: build.mutation<unknown, CancelRequest>({
      query: ({ orderNumber, ...body }) => ({ url: `/orders/${orderNumber}/cancel`, method: 'POST', body }),
      invalidatesTags: ['Order', 'Overview', 'Product'],
    }),
    // The invoice is a PDF, saved as a download as it arrives; the file itself never enters the store. It exists only once
    // the order has dispatched, and until then the backend refuses with a reason.
    downloadInvoice: build.mutation<void, string>({
      queryFn: async (orderNumber, _api, _extra, baseQuery) => {
        const result = await baseQuery({
          url: `/orders/${orderNumber}/invoice`,
          // The file when it comes; the backend's JSON error body when it does not, so the reason can be shown.
          responseHandler: (response) => (response.ok ? response.blob() : response.json()),
        })
        if (result.error) return { error: result.error }

        // The base query hands back the fetch response in `meta`, though this callback sees its type as empty.
        const response = (result.meta as { response?: Response } | undefined)?.response
        const filename = filenameFrom(response?.headers.get('Content-Disposition'), `${orderNumber}-invoice.pdf`)
        saveFile(result.data as Blob, filename)
        return { data: undefined }
      },
    }),
  }),
})

export const {
  useListOrdersQuery,
  useGetOrderQuery,
  useDispatchOrderMutation,
  useCancelOrderMutation,
  useDownloadInvoiceMutation,
} = ordersApi
