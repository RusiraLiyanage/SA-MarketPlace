import { api } from 'src/infra/api'
import type {
  CatalogueList,
  CategoryTreeItem,
  ListCatalogueRequest,
  ProductEdit,
} from 'src/store/catalogue/types'

export const catalogueApi = api.injectEndpoints({
  endpoints: (build) => ({
    listCatalogue: build.query<CatalogueList, ListCatalogueRequest>({
      query: (params) => ({ url: '/catalogue', params }),
      providesTags: ['Product'],
    }),
    // For the Category and Sub-category dropdowns.
    getCategories: build.query<CategoryTreeItem[], void>({
      query: () => '/catalogue/categories',
    }),
    getProduct: build.query<ProductEdit, string>({
      query: (productId) => `/catalogue/${productId}`,
      providesTags: ['Product'],
    }),
    // The form saves as multipart, so the images go in the same request. The body is a FormData (see `productFormData`), which the
    // browser sends with its own content type.
    createProduct: build.mutation<ProductEdit, FormData>({
      query: (body) => ({ url: '/catalogue', method: 'POST', body }),
      invalidatesTags: ['Product', 'Overview'],
    }),
    editProduct: build.mutation<ProductEdit, { productId: string; body: FormData }>({
      query: ({ productId, body }) => ({ url: `/catalogue/${productId}`, method: 'PATCH', body }),
      invalidatesTags: ['Product', 'Overview'],
    }),
    // Off sale for good: kept for history, never deleted. Orders already placed are not affected.
    retireProduct: build.mutation<unknown, string>({
      query: (productId) => ({ url: `/catalogue/${productId}/retire`, method: 'POST' }),
      invalidatesTags: ['Product', 'Overview'],
    }),
  }),
})

export const {
  useListCatalogueQuery,
  useGetCategoriesQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useEditProductMutation,
  useRetireProductMutation,
} = catalogueApi
