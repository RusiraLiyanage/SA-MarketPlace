import { Typography } from 'antd'
import styled from 'styled-components'
import SACard from 'src/components/SACard'
import { addressLines, hasDispatched } from 'src/store/orders/selector'
import type { AdminOrderDetail } from 'src/store/orders/types'
import { formatDate } from 'src/utils/format'

// Where it goes, and, once the supplier has dispatched it, how it is getting there. Nothing here can be changed: it is the supplier's to manage.
const DeliveryCard = ({ order }: { order: AdminOrderDetail }) => {
  const { delivery, dispatch } = order
  const dates = [
    { label: 'Dispatched', value: dispatch.dispatchedAt },
    { label: 'Estimated delivery', value: dispatch.estimatedDeliveryAt },
    { label: 'Delivered', value: dispatch.deliveredAt },
  ].filter((date): date is { label: string; value: string } => date.value !== null)

  return (
    <SACard title="Delivery & tracking">
      <Address>
        {addressLines(order.customerName, delivery).map((line) => (
          <div key={line}>{line}</div>
        ))}
      </Address>
      {delivery.notes && (
        <Block>
          <Typography.Text type="secondary">Delivery notes</Typography.Text>
          <div>{delivery.notes}</div>
        </Block>
      )}
      <Block>
        <Typography.Text type="secondary">Carrier / tracking</Typography.Text>
        {hasDispatched(dispatch) ? (
          <>
            <div>{[dispatch.carrierName, dispatch.trackingNumber].filter(Boolean).join(' · ') || 'Dispatched'}</div>
            {dates.map(({ label, value }) => (
              <Typography.Text key={label} type="secondary" style={{ display: 'block' }}>
                {label} {formatDate(value)}
              </Typography.Text>
            ))}
          </>
        ) : (
          <div>Not yet dispatched</div>
        )}
      </Block>
    </SACard>
  )
}

export default DeliveryCard

const Address = styled.address`
  font-style: normal;
  color: ${({ theme }) => theme.colorTextSecondary};
`

const Block = styled.div`
  margin-top: ${({ theme }) => theme.margin}px;
  padding-top: ${({ theme }) => theme.margin}px;
  border-top: 1px solid ${({ theme }) => theme.colorBorderSecondary};
`
