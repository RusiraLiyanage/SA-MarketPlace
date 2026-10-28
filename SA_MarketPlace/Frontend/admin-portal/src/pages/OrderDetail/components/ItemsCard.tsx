import { Typography } from 'antd'
import styled from 'styled-components'
import SACard from 'src/components/SACard'
import type { AdminOrderDetail } from 'src/store/orders/types'
import { formatCurrency } from 'src/utils/format'

// What was ordered, as it was priced at the time (the backend freezes the price at purchase), and what it came to.
const ItemsCard = ({ order }: { order: AdminOrderDetail }) => (
  <SACard title="Items ordered">
    <Lines>
      {order.items.map(({ productName, sku, quantity, lineTotal }) => (
        <Line key={`${sku}-${productName}`}>
          <div>
            <div>{productName}</div>
            <Typography.Text type="secondary">SKU: {sku}</Typography.Text>
          </div>
          <Amount>
            ×{quantity} {formatCurrency(lineTotal)}
          </Amount>
        </Line>
      ))}
    </Lines>
    <Total>
      <strong>Total (GST incl.)</strong>
      <strong>{formatCurrency(order.total)}</strong>
    </Total>
    <Typography.Text type="secondary">Includes {formatCurrency(order.gstTotal)} GST</Typography.Text>
  </SACard>
)

export default ItemsCard

const Lines = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`

const Line = styled.li`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.margin}px;
  padding: ${({ theme }) => theme.paddingSM}px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colorBorderSecondary};
`

const Amount = styled.strong`
  flex: none;
  white-space: nowrap;
`

const Total = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.margin}px;
  padding: ${({ theme }) => theme.paddingSM}px 0 ${({ theme }) => theme.paddingXXS}px;
  font-size: ${({ theme }) => theme.fontSizeLG}px;
`
