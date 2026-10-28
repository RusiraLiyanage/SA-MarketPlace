import { Alert } from 'antd'
import styled from 'styled-components'
import DownloadInvoiceButton from 'src/components/DownloadInvoiceButton'
import SAPageHeader from 'src/components/SAPageHeader'
import DeliveryCard from 'src/pages/OrderDetail/components/DeliveryCard'
import ItemsCard from 'src/pages/OrderDetail/components/ItemsCard'
import Summary from 'src/pages/OrderDetail/components/Summary'
import { FulfilmentStage } from 'src/store/orders/types'
import { invoiceUnavailableReason } from 'src/store/orders/selector'
import type { AdminOrderDetail } from 'src/store/orders/types'

// One order, read-only: fulfilment is the supplier's to manage, not Sample Assist's.
const OrderView = ({ order }: { order: AdminOrderDetail }) => (
  <>
    <SAPageHeader
      title={`Order ${order.orderNumber}`}
      subtitle="Read-only — fulfilment is managed by the supplier, not Sample Assist"
      extra={
        <DownloadInvoiceButton
          orderNumber={order.orderNumber}
          available={order.canDownloadInvoice}
          unavailableReason={invoiceUnavailableReason(order.fulfilment)}
        />
      }
    />
    {order.fulfilment === FulfilmentStage.cancelled && (
      <Alert showIcon type="error" title="This order was cancelled" description={order.cancellationReason ?? undefined} />
    )}
    <Summary order={order} />
    <Columns>
      <ItemsCard order={order} />
      <DeliveryCard order={order} />
    </Columns>
  </>
)

export default OrderView

const Columns = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: ${({ theme }) => theme.margin}px;
  align-items: start;
`
