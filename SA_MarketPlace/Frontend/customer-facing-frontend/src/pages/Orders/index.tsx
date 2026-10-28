import { Outlet } from 'react-router'
import PageLayout from 'src/components/layouts/PageLayout'
import SALoadError from 'src/components/SALoadError'
import SAPagination from 'src/components/SAPagination'
import SASkeleton from 'src/components/SASkeleton'
import OrderFilters from 'src/pages/Orders/components/OrderFilters'
import OrdersTable from 'src/pages/Orders/components/OrdersTable'
import { hasOrdersFilter, toOrdersRequest } from 'src/pages/Orders/ordersQuery'
import { useOrdersQuery } from 'src/pages/Orders/useOrdersQuery'
import { useListOrdersQuery } from 'src/store/orders/actions'

const OrdersPage = () => {
  const { query, update, clear } = useOrdersQuery()
  // `data` keeps the previous results while a new filter loads, so the table dims instead of flashing empty.
  const { data: orders, error, isLoading, isFetching, refetch } = useListOrdersQuery(toOrdersRequest(query))

  return (
    <PageLayout title="My orders">
      <OrderFilters
        search={query.search}
        status={query.status}
        onSearch={(search) => update({ search })}
        onStatusChange={(status) => update({ status })}
      />
      {isLoading ? (
        <SASkeleton rows={6} />
      ) : !orders ? (
        <SALoadError what="your orders" error={error} onRetry={refetch} />
      ) : (
        <>
          <OrdersTable orders={orders.data} loading={isFetching} filtered={hasOrdersFilter(query)} onClearFilters={clear} />
          {orders.pagingMeta.totalItem > 0 && (
            <SAPagination meta={orders.pagingMeta} onChange={(page, limit) => update({ page, limit })} />
          )}
        </>
      )}
      <Outlet />
    </PageLayout>
  )
}

export default OrdersPage
