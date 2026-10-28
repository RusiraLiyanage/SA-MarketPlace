import { api } from 'src/infra/api'
import type { PaginatedData } from 'src/infra/pagination'
import type { ListProductsRequest } from 'src/store/products/types'
import type { CategoryOption, ProductDetail, ProductListItem } from 'src/types'

export const productsApi = api.injectEndpoints({
  endpoints: (build) => ({
    listProducts: build.query<PaginatedData<ProductListItem>, ListProductsRequest>({
      query: (params) => ({ url: '/products', params }),
      providesTags: ['Product'],
    }),
    getProduct: build.query<ProductDetail, string>({
      query: (productId) => `/products/${productId}`,
      providesTags: ['Product'],
    }),
    // The filter chips; categories change rarely, so a visit keeps them for five minutes.
    getCategories: build.query<CategoryOption[], void>({
      query: () => '/products/categories',
      keepUnusedDataFor: 300,
    }),
  }),
})

export const { useListProductsQuery, useGetProductQuery, useGetCategoriesQuery } = productsApi
