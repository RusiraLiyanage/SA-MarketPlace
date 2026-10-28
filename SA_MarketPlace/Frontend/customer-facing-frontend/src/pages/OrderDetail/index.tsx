import { App, Button } from 'antd'
import { Outlet, useNavigate, useParams } from 'react-router'
import styled from 'styled-components'
import PageLayout from 'src/components/layouts/PageLayout'
import SAEmpty from 'src/components/SAEmpty'
import SALoadError from 'src/components/SALoadError'
import SASkeleton from 'src/components/SASkeleton'
import { getErrorMessage, isApiError } from 'src/infra/errors'
import DeliveryAddressCard from 'src/pages/OrderDetail/components/DeliveryAddressCard'
import OrderActions from 'src/pages/OrderDetail/components/OrderActions'
import OrderItemsTable from 'src/pages/OrderDetail/components/OrderItemsTable'
import OrderProgressSteps from 'src/pages/OrderDetail/components/OrderProgressSteps'
import ShipmentInfo from 'src/pages/OrderDetail/components/ShipmentInfo'
import { PATHS } from 'src/router/paths'
import { useDownloadInvoiceMutation, useGetOrderQuery } from 'src/store/orders/actions'
import { useOrganisationName } from 'src/store/profile/actions'
import { formatDate } from 'src/utils/format'

const OrderDetailPage = () => {
  const { orderNumber = '' } = useParams()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const organisationName = useOrganisationName()
  const { data: order, error, isLoading, refetch } = useGetOrderQuery(orderNumber)
  const [downloadInvoice, { isLoading: isDownloading }] = useDownloadInvoiceMutation()

  if (isLoading) {
    return (
      <PageLayout title={`Order ${orderNumber}`}>
        <SASkeleton rows={10} />
      </PageLayout>
    )
  }

  if (!order) {
    // The backend answers 404 for an order that does not exist or belongs to someone else, and 400 for a malformed number.
    const notFound = isApiError(error) && (error.status === 404 || error.status === 400)
    return (
      <PageLayout title={notFound ? 'Order not found' : `Order ${orderNumber}`}>
        {notFound ? (
          <SAEmpty
            title="We could not find that order"
            description="Check My orders to see everything you have placed."
            action={
              <Button type="primary" onClick={() => navigate(PATHS.orders)}>
                Go to My orders
              </Button>
            }
          />
        ) : (
          <SALoadError what="this order" error={error} onRetry={refetch} />
        )}
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title={`Order ${order.orderNumber}`}
      subtitle={`Placed on ${formatDate(order.placedAt)} · Sold by ${order.supplierName}`}
      extra={
        <OrderActions
          status={order.status}
          downloading={isDownloading}
          onDownloadInvoice={() =>
            downloadInvoice(order.orderNumber)
              .unwrap()
              .catch((failure) => message.error(getErrorMessage(failure)))
          }
          onReorder={() => navigate(PATHS.reorderFromOrderDetail(order.orderNumber))}
        />
      }
    >
      <OrderProgressSteps status={order.status} cancellationReason={order.cancellationReason} />
      <ShipmentInfo delivery={order.delivery} />
      <Columns>
        <OrderItemsTable items={order.items} subtotal={order.subtotal} gstTotal={order.gstTotal} total={order.total} />
        <DeliveryAddressCard
          delivery={order.delivery}
          payment={order.payment}
          organisationName={organisationName}
        />
      </Columns>
      <Outlet />
    </PageLayout>
  )
}

export default OrderDetailPage

const Columns = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: ${({ theme }) => theme.marginLG}px;
  align-items: start;
`
