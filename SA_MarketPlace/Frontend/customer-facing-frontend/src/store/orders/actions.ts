import { api } from 'src/infra/api'
import type { PaginatedData } from 'src/infra/pagination'
import { cartApi } from 'src/store/cart/actions'
import type { ListOrdersRequest } from 'src/store/orders/types'
import type { OrderDetail, OrderSummary, ReorderResult } from 'src/types'
import { filenameFrom, saveFile } from 'src/utils/download'

export const ordersApi = api.injectEndpoints({
  endpoints: (build) => ({
    listOrders: build.query<PaginatedData<OrderSummary>, ListOrdersRequest>({
      query: (params) => ({ url: '/orders', params }),
      providesTags: ['Order'],
    }),
    getOrder: build.query<OrderDetail, string>({
      query: (orderNumber) => `/orders/${orderNumber}`,
      providesTags: ['Order'],
    }),
    // Puts the order's items back in the cart at today's prices; nothing is ordered. Each line says whether it went in, and
    // the answer carries the updated cart, which replaces the cached one.
    reorder: build.mutation<ReorderResult, string>({
      query: (orderNumber) => ({ url: `/orders/${orderNumber}/reorder`, method: 'POST' }),
      onQueryStarted: async (_orderNumber, { dispatch, queryFulfilled }) => {
        const { data } = await queryFulfilled.catch(() => ({ data: undefined }))
        if (data) dispatch(cartApi.util.updateQueryData('getCart', undefined, () => data.cart))
      },
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
        const filename = filenameFrom(response?.headers.get('Content-Disposition'), `invoice-${orderNumber}.pdf`)
        saveFile(result.data as Blob, filename)
        return { data: undefined }
      },
    }),
  }),
})

export const { useListOrdersQuery, useGetOrderQuery, useReorderMutation, useDownloadInvoiceMutation } = ordersApi
