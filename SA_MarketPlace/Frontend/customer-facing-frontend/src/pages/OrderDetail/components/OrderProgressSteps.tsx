import { Alert, ConfigProvider, Steps, theme } from 'antd'
import styled from 'styled-components'
import type { OrderStatus } from 'src/types'

const STEPS = ['Order placed', 'Confirmed', 'Dispatched', 'Delivered']

// How many steps are done. The seller's "picking" shows as Confirmed, as everywhere else the buyer sees a status.
const COMPLETED: Record<Exclude<OrderStatus, 'cancelled'>, number> = {
  placed: 1,
  confirmed: 2,
  picking: 2,
  dispatched: 3,
  delivered: 4,
}

interface Props {
  status: OrderStatus
  cancellationReason: string | null
}

const OrderProgressSteps = ({ status, cancellationReason }: Props) => {
  const { token } = theme.useToken()

  if (status === 'cancelled') {
    return (
      <Alert
        showIcon
        type="error"
        title="This order was cancelled"
        description={cancellationReason ? `Reason: ${cancellationReason}` : undefined}
      />
    )
  }

  const completed = COMPLETED[status]

  return (
    <Card aria-label="Order progress">
      {/* Done steps are green, as in the design, so the steps get the success colour as their primary. */}
      <ConfigProvider theme={{ token: { colorPrimary: token.colorSuccess } }}>
        <Steps
          titlePlacement="vertical"
          // Past the last step, so none is "current": each step is simply done or waiting.
          current={STEPS.length}
          items={STEPS.map((title, index) => ({ title, status: index < completed ? 'finish' : 'wait' }))}
        />
      </ConfigProvider>
    </Card>
  )
}

export default OrderProgressSteps

const Card = styled.section`
  padding: ${({ theme }) => theme.padding}px ${({ theme }) => theme.paddingLG}px;
  background: ${({ theme }) => theme.colorBgContainer};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;

  /* Finished steps are green with a white tick, as in the design; the primary blue stays for actions. */
  /* !important because Ant Design's own selector for a finished icon is more specific than any class we can add. */
  .ant-steps-item-finish .ant-steps-item-icon {
    background-color: ${({ theme }) => theme.colorSuccess} !important;
    border-color: ${({ theme }) => theme.colorSuccess} !important;
  }

  .ant-steps-item-finish .ant-steps-item-icon-finish {
    color: ${({ theme }) => theme.colorTextLightSolid};
  }

  .ant-steps-item-finish .ant-steps-item-tail::after {
    background: ${({ theme }) => theme.colorSuccess};
  }
`
