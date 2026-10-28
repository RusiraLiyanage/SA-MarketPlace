import { Typography } from 'antd'
import styled from 'styled-components'
import type { OrderDetail } from 'src/types'
import { formatDate } from 'src/utils/format'

const BLANK = '—'

interface Props {
  delivery: OrderDetail['delivery']
}

// Carrier, tracking and the dispatch date stay blank until the supplier dispatches (they are null until then).
const ShipmentInfo = ({ delivery }: Props) => {
  const { carrierName, trackingNumber, dispatchedAt, estimatedDeliveryAt, deliveredAt } = delivery
  const fields = [
    { label: 'Carrier', value: carrierName },
    { label: 'Tracking #', value: trackingNumber, copyable: true },
    { label: 'Dispatched', value: dispatchedAt && formatDate(dispatchedAt) },
    { label: 'Est. delivery', value: estimatedDeliveryAt && formatDate(estimatedDeliveryAt) },
    ...(deliveredAt ? [{ label: 'Delivered', value: formatDate(deliveredAt) }] : []),
  ]

  return (
    <Card aria-label="Shipment">
      <Fields>
        {fields.map(({ label, value, copyable }) => (
          <div key={label}>
            <Label>{label}</Label>
            <Typography.Text strong copyable={copyable && value ? { text: value } : false}>
              {value || BLANK}
            </Typography.Text>
          </div>
        ))}
      </Fields>
      {!dispatchedAt && (
        <Typography.Text type="secondary">Carrier and tracking appear once the supplier dispatches your order.</Typography.Text>
      )}
    </Card>
  )
}

export default ShipmentInfo

const Card = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.marginSM}px;
  padding: ${({ theme }) => theme.padding}px ${({ theme }) => theme.paddingLG}px;
  background: ${({ theme }) => theme.colorBgContainer};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;
`

const Fields = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: ${({ theme }) => theme.margin}px;
`

const Label = styled.div`
  color: ${({ theme }) => theme.colorTextSecondary};
  font-size: ${({ theme }) => theme.fontSizeSM}px;
`
