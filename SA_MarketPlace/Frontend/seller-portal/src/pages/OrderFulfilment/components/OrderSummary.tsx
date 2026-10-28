import { Typography } from 'antd'
import styled from 'styled-components'
import CardLabel from 'src/pages/OrderFulfilment/components/CardLabel'
import { formatAddress } from 'src/store/orders/selector'
import type { OrderDetail } from 'src/store/orders/types'
import { formatDate } from 'src/utils/format'

// Who it is for, where it goes, and when it came in.
const OrderSummary = ({ order }: { order: OrderDetail }) => {
  const { delivery } = order

  return (
    <Card aria-label="Order summary">
      <CardLabel>Order summary</CardLabel>
      <Rows>
        <Row>
          <Typography.Text type="secondary">Customer</Typography.Text>
          <strong>{order.organisationName ?? 'No organisation'}</strong>
        </Row>
        <Row>
          <Typography.Text type="secondary">Delivery</Typography.Text>
          <div>
            <strong>{formatAddress(delivery)}</strong>
            {delivery.attentionName && <Note>Attention: {delivery.attentionName}</Note>}
            {delivery.notes && <Note>{delivery.notes}</Note>}
          </div>
        </Row>
        <Row>
          <Typography.Text type="secondary">Date received</Typography.Text>
          <strong>{formatDate(order.placedAt)}</strong>
        </Row>
      </Rows>
    </Card>
  )
}

export default OrderSummary

const Card = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.marginSM}px;
  padding: ${({ theme }) => theme.padding}px ${({ theme }) => theme.paddingLG}px;
  background: ${({ theme }) => theme.colorBgContainer};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;
`

const Rows = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.marginXS}px;
`

const Row = styled.div`
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: ${({ theme }) => theme.margin}px;
`

const Note = styled.div`
  color: ${({ theme }) => theme.colorTextDescription};
`
