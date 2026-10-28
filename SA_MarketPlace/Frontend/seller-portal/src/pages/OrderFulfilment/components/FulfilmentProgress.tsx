import { Alert, Steps } from 'antd'
import styled from 'styled-components'
import CardLabel from 'src/pages/OrderFulfilment/components/CardLabel'
import { FULFILMENT_STEPS, currentStep } from 'src/store/orders/selector'
import { SellerOrderStatus, type OrderDetail } from 'src/store/orders/types'

// Where the order is: Received, Picking & Packing, Dispatched, Delivered. A cancelled order is not on this path at all, so
// it gets the reason instead of a half-finished row of steps.
const FulfilmentProgress = ({ order }: { order: Pick<OrderDetail, 'status' | 'cancellationReason'> }) => (
  <Card aria-label="Fulfilment progress">
    <CardLabel>Fulfilment progress</CardLabel>
    {order.status === SellerOrderStatus.cancelled ? (
      <Alert showIcon type="error" title="This order was cancelled" description={order.cancellationReason ?? undefined} />
    ) : (
      <Steps current={currentStep(order.status)} items={FULFILMENT_STEPS.map((title) => ({ title }))} />
    )}
  </Card>
)

export default FulfilmentProgress

const Card = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.margin}px;
  padding: ${({ theme }) => theme.padding}px ${({ theme }) => theme.paddingLG}px;
  background: ${({ theme }) => theme.colorBgContainer};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;
`
