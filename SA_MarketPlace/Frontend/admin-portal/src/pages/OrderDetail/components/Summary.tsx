import styled from 'styled-components'
import SAToneTag from 'src/components/SAToneTag'
import { FULFILMENT_DISPLAY, paymentDisplay } from 'src/store/orders/selector'
import type { AdminOrderDetail } from 'src/store/orders/types'
import { formatDate } from 'src/utils/format'

// The five facts across the top: who bought, who sells, how it was paid, where it is, and when it was placed.
const Summary = ({ order }: { order: AdminOrderDetail }) => {
  const payment = paymentDisplay(order.payment)
  const fulfilment = FULFILMENT_DISPLAY[order.fulfilment]

  return (
    <Strip aria-label="Order summary">
      <Fact>
        <dt>Customer</dt>
        <dd>
          <strong>{order.customerName}</strong>
        </dd>
      </Fact>
      <Fact>
        <dt>Supplier</dt>
        <dd>
          <strong>{order.supplierName}</strong>
        </dd>
      </Fact>
      <Fact>
        <dt>Payment</dt>
        <dd>
          <SAToneTag tone={payment.tone}>{payment.label}</SAToneTag>
        </dd>
      </Fact>
      <Fact>
        <dt>Fulfilment</dt>
        <dd>
          <SAToneTag tone={fulfilment.tone}>{fulfilment.label}</SAToneTag>
        </dd>
      </Fact>
      <Fact>
        <dt>Placed</dt>
        <dd>
          <strong>{formatDate(order.placedAt)}</strong>
        </dd>
      </Fact>
    </Strip>
  )
}

export default Summary

const Strip = styled.dl`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: ${({ theme }) => theme.margin}px;
  margin: 0;
  padding: ${({ theme }) => theme.padding}px ${({ theme }) => theme.paddingLG}px;
  background: ${({ theme }) => theme.colorBgContainer};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;
`

const Fact = styled.div`
  dt {
    margin-bottom: ${({ theme }) => theme.marginXXS}px;
    color: ${({ theme }) => theme.colorTextSecondary};
    font-size: ${({ theme }) => theme.fontSizeSM}px;
  }

  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
`
