import { Button } from 'antd'
import { useNavigate, useParams } from 'react-router'
import SAEmpty from 'src/components/SAEmpty'
import SALoadError from 'src/components/SALoadError'
import SAPageHeader from 'src/components/SAPageHeader'
import SASkeleton from 'src/components/SASkeleton'
import { ERROR_CODE, isApiError } from 'src/infra/errors'
import OrderView from 'src/pages/OrderDetail/components/OrderView'
import { PATHS } from 'src/router/paths'
import { useGetOrderQuery } from 'src/store/orders/actions'

const OrderDetailPage = () => {
  const { orderNumber = '' } = useParams()
  const navigate = useNavigate()
  // `currentData` belongs to the order number in the address. `data` would hold the previous order while this one loads or fails,
  // so a mistyped link would show someone else's order.
  const { currentData: order, error, isFetching, refetch } = useGetOrderQuery(orderNumber)
  const title = `Order ${orderNumber}`

  if (isFetching && !order) {
    return (
      <>
        <SAPageHeader title={title} />
        <SASkeleton rows={8} />
      </>
    )
  }

  if (!order) {
    // 404 is an order that does not exist; 400 is an address that is not even an order number.
    const notFound = isApiError(error) && (error.code === ERROR_CODE.notFound || error.code === ERROR_CODE.badRequest)
    return (
      <>
        <SAPageHeader title={title} />
        {notFound ? (
          <SAEmpty
            title="Order not found"
            description="The order number may be wrong."
            action={<Button onClick={() => navigate(PATHS.orders)}>Back to orders</Button>}
          />
        ) : (
          <SALoadError what="this order" error={error} onRetry={refetch} />
        )}
      </>
    )
  }

  return <OrderView key={order.orderNumber} order={order} />
}

export default OrderDetailPage
