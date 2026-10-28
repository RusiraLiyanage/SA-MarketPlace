import SALoadError from 'src/components/SALoadError'
import SAPageHeader from 'src/components/SAPageHeader'
import SAPagination from 'src/components/SAPagination'
import SASkeleton from 'src/components/SASkeleton'
import { DEFAULT_ORDER_SORT } from 'src/constants'
import ExportCsvButton from 'src/pages/Orders/components/ExportCsvButton'
import OrderFilters from 'src/pages/Orders/components/OrderFilters'
import OrdersTable from 'src/pages/Orders/components/OrdersTable'
import { hasOrdersFilter, toOrdersFilter, toOrdersRequest } from 'src/pages/Orders/ordersQuery'
import { useOrdersQuery } from 'src/pages/Orders/useOrdersQuery'
import { useListOrdersQuery } from 'src/store/orders/actions'

// Every order, read-only: fulfilment is the supplier's to manage, not Sample Assist's. Export CSV saves what the table shows.
const OrdersPage = () => {
  const { query, update, clear } = useOrdersQuery()
  // `data` keeps the previous results while a new filter loads, so the table dims instead of flashing empty.
  const { data: orders, error, isLoading, isFetching, refetch } = useListOrdersQuery(toOrdersRequest(query))

  return (
    <>
      <SAPageHeader
        title="All orders"
        subtitle="Read-only oversight of every marketplace and Collection Manager order"
        extra={<ExportCsvButton filter={toOrdersFilter(query)} />}
      />
      <OrderFilters
        search={query.search}
        payment={query.payment}
        fulfilment={query.fulfilment}
        onSearch={(search) => update({ search })}
        onPaymentChange={(payment) => update({ payment })}
        onFulfilmentChange={(fulfilment) => update({ fulfilment })}
      />
      {isLoading ? (
        <SASkeleton rows={6} />
      ) : !orders ? (
        <SALoadError what="the orders" error={error} onRetry={refetch} />
      ) : (
        <>
          <OrdersTable
            orders={orders.data}
            loading={isFetching}
            sortField={query.orderField}
            sortOrder={query.order}
            onSortChange={({ orderField, order }) => update(orderField && order ? { orderField, order } : { ...DEFAULT_ORDER_SORT })}
            filtered={hasOrdersFilter(query)}
            onClearFilters={clear}
          />
          {orders.pagingMeta.totalItem > 0 && <SAPagination meta={orders.pagingMeta} onChange={(page, limit) => update({ page, limit })} />}
        </>
      )}
    </>
  )
}

export default OrdersPage
