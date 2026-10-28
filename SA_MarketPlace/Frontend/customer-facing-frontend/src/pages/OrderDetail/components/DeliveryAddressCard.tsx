import { Typography } from 'antd'
import styled from 'styled-components'
import type { OrderDetail, PaymentStatus } from 'src/types'
import { formatDate } from 'src/utils/format'
import { describePayment } from 'src/utils/payment'
import { SASectionTitle } from 'src/components/SATitle'

const PAYMENT_STATUS: Record<PaymentStatus, string> = {
  pending: 'Payment pending',
  paid: 'Paid',
  failed: 'Payment failed',
  refunded: 'Refunded',
}

interface Props {
  delivery: OrderDetail['delivery']
  payment: OrderDetail['payment']
  /** The buyer's organisation; the order's delivery address does not carry it. */
  organisationName: string | null
}

const DeliveryAddressCard = ({ delivery, payment, organisationName }: Props) => (
  <Card aria-label="Delivery address">
    <SASectionTitle>Delivery address</SASectionTitle>
    <Address>
      {organisationName && <div>{organisationName}</div>}
      {delivery.attentionName && <div>Attn: {delivery.attentionName}</div>}
      <div>{delivery.streetAddress}</div>
      <div>{`${delivery.suburb} ${delivery.state} ${delivery.postcode}`}</div>
      <div>{delivery.country}</div>
      {delivery.notes && <Notes>Notes: {delivery.notes}</Notes>}
    </Address>
    <Payment>
      <Label>Payment method</Label>
      <div>{describePayment(payment)}</div>
      <Typography.Text type="secondary">
        {PAYMENT_STATUS[payment.status]}
        {payment.status === 'paid' && payment.paidAt ? ` on ${formatDate(payment.paidAt)}` : ''}
      </Typography.Text>
    </Payment>
  </Card>
)

export default DeliveryAddressCard

const Card = styled.section`
  padding: ${({ theme }) => theme.padding}px;
  background: ${({ theme }) => theme.colorBgContainer};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;
`

const Address = styled.address`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.marginXXS}px;
  font-style: normal;
`

const Notes = styled.div`
  margin-top: ${({ theme }) => theme.marginXS}px;
  color: ${({ theme }) => theme.colorTextSecondary};
`

const Payment = styled.div`
  margin-top: ${({ theme }) => theme.margin}px;
  padding-top: ${({ theme }) => theme.margin}px;
  border-top: 1px solid ${({ theme }) => theme.colorBorderSecondary};
`

const Label = styled.div`
  color: ${({ theme }) => theme.colorTextSecondary};
`
