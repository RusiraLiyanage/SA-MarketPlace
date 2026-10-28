import { Alert, App, Button, Form, Input, Typography } from 'antd'
import { useNavigate } from 'react-router'
import styled from 'styled-components'
import CardLabel from 'src/pages/OrderFulfilment/components/CardLabel'
import { getErrorMessage } from 'src/infra/errors'
import { PATHS } from 'src/router/paths'
import { useDispatchOrderMutation } from 'src/store/orders/actions'
import { SellerOrderStatus, type OrderDetail } from 'src/store/orders/types'
import { formatDate } from 'src/utils/format'
import { requiredMarkAfter } from 'src/utils/requiredMark'

interface Props {
  order: OrderDetail
  pickedCount: number
}

interface DispatchValues {
  carrierName: string
  trackingNumber: string
}

// The right-hand card. While the order awaits dispatch it is the form; once it has gone out it shows what was recorded.
// A cancelled order has nothing to dispatch, so the card is not drawn.
const DispatchPanel = ({ order, pickedCount }: Props) => {
  if (order.status === SellerOrderStatus.cancelled) return null

  return (
    <Card aria-label="Dispatch details">
      <CardLabel>Dispatch details</CardLabel>
      {order.canDispatch ? <DispatchForm order={order} pickedCount={pickedCount} /> : <DispatchedDetails order={order} />}
    </Card>
  )
}

export default DispatchPanel

const DispatchForm = ({ order, pickedCount }: Props) => {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [dispatch, { isLoading }] = useDispatchOrderMutation()
  const total = order.items.length
  const ready = pickedCount === total && total > 0

  const confirm = async ({ carrierName, trackingNumber }: DispatchValues) => {
    try {
      await dispatch({ orderNumber: order.orderNumber, carrierName: carrierName.trim(), trackingNumber: trackingNumber.trim() }).unwrap()
      message.success('Order dispatched')
    } catch (error) {
      message.error(getErrorMessage(error))
    }
  }

  return (
    <>
      {/* The reason the button is off sits right above it, never somewhere else. */}
      {ready ? (
        <Alert showIcon type="success" title="All items picked — ready to dispatch" />
      ) : (
        <Alert showIcon type="warning" title="Mark all items as picked to enable dispatch" description={`${pickedCount} of ${total} picked`} />
      )}
      <Form<DispatchValues>
        layout="vertical"
        requiredMark={requiredMarkAfter}
        initialValues={{ carrierName: order.dispatch.defaultCarrier ?? '' }}
        onFinish={confirm}
      >
        <Form.Item
          label="Carrier name"
          name="carrierName"
          rules={[{ required: true, whitespace: true, message: 'Enter the carrier' }, { max: 120, message: 'Carrier name is too long' }]}
        >
          <Input placeholder="Enter carrier name" />
        </Form.Item>
        <Form.Item
          label="Tracking number"
          name="trackingNumber"
          rules={[{ required: true, whitespace: true, message: 'Enter the tracking number' }, { max: 100, message: 'Tracking number is too long' }]}
        >
          <Input placeholder="Enter tracking number" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" size="large" block disabled={!ready} loading={isLoading}>
            Confirm dispatch
          </Button>
        </Form.Item>
      </Form>
      <CannotFulfil type="link" danger onClick={() => navigate(PATHS.cancelOrder(order.orderNumber))}>
        Cannot fulfil this order
      </CannotFulfil>
    </>
  )
}

// What the seller recorded, and when it is due. The backend sets the dates itself, so they are shown, not asked for.
const DispatchedDetails = ({ order }: { order: OrderDetail }) => {
  const { dispatch } = order
  const rows = [
    { label: 'Carrier', value: dispatch.carrierName },
    { label: 'Tracking number', value: dispatch.trackingNumber },
    { label: 'Dispatched', value: dispatch.dispatchedAt && formatDate(dispatch.dispatchedAt) },
    { label: 'Estimated delivery', value: dispatch.estimatedDeliveryAt && formatDate(dispatch.estimatedDeliveryAt) },
    { label: 'Delivered', value: dispatch.deliveredAt && formatDate(dispatch.deliveredAt) },
  ].filter((row) => row.value)

  return (
    <dl>
      {rows.map(({ label, value }) => (
        <Row key={label}>
          <Typography.Text type="secondary">{label}</Typography.Text>
          <dd>{value}</dd>
        </Row>
      ))}
    </dl>
  )
}

const Card = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.marginSM}px;
  padding: ${({ theme }) => theme.padding}px ${({ theme }) => theme.paddingLG}px;
  background: ${({ theme }) => theme.colorBgContainer};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;

  dl {
    margin: 0;
  }
`

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.margin}px;
  padding: ${({ theme }) => theme.paddingXS}px 0;

  dd {
    margin: 0;
    font-weight: 600;
    text-align: right;
  }
`

const CannotFulfil = styled(Button)`
  align-self: center;
`
