import { Table, type TableProps } from 'antd'
import { Order, type PagingMeta, type RequestPagination } from 'src/infra/pagination'

interface Props<T extends object> extends TableProps<T> {
  meta?: PagingMeta
  onMetaChange?: (request: RequestPagination) => void
}

// The one table used across the app. Pass `meta` for server-side paging and sorting; omit it for a plain table.
function SATable<T extends object>({ meta, onMetaChange, ...rest }: Props<T>) {
  return (
    <Table<T>
      {...rest}
      pagination={
        meta
          ? { current: meta.page, pageSize: meta.limit, total: meta.totalItem, showSizeChanger: false }
          : false
      }
      onChange={(pagination, _filters, sorter) => {
        const single = Array.isArray(sorter) ? undefined : sorter
        onMetaChange?.({
          page: pagination.current ?? 1,
          limit: pagination.pageSize ?? meta?.limit ?? 10,
          orderField: single?.field as string | undefined,
          order: single?.order === 'ascend' ? Order.ASC : single?.order === 'descend' ? Order.DESC : undefined,
        })
      }}
    />
  )
}

export default SATable
