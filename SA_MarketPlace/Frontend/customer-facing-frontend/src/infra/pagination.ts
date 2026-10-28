// Mirrors the backend's paging contract: requests send page and limit, responses return pagingMeta.
export interface PagingMeta {
  page: number
  limit: number
  totalItem: number
  totalPage: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export interface PaginatedData<T> {
  data: T[]
  pagingMeta: PagingMeta
}

export const Order = { ASC: 'ASC', DESC: 'DESC' } as const
export type Order = (typeof Order)[keyof typeof Order]

export interface RequestPagination<T extends object = object> {
  page: number
  limit: number
  order?: Order
  orderField?: keyof T | string
}
