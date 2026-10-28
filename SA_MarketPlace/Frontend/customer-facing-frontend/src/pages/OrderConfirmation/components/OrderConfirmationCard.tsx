import { CheckOutlined } from '@ant-design/icons'
import { Button, Flex, Typography } from 'antd'
import { Link, useNavigate } from 'react-router'
import styled from 'styled-components'
import { PATHS } from 'src/router/paths'
import type { CheckoutResult } from 'src/types'
import { formatCurrency, formatDate, pluralise } from 'src/utils/format'
import { describePayment } from 'src/utils/payment'
import { SAPageTitle } from 'src/components/SATitle'

// One block per order: a cart with several suppliers is placed as several orders.
const OrderConfirmationCard = ({ result }: { result: CheckoutResult }) => {
  const navigate = useNavigate()
  const { orders, delivery, payment, total } = result
  const first = orders[0]

  return (
    <Page>
      <Heading>
        <Tick>
          <CheckOutlined />
        </Tick>
        <SAPageTitle>
          {orders.length === 1 ? 'Order placed successfully' : `${orders.length} orders placed successfully`}
        </SAPageTitle>
        <Typography.Text type="secondary">
          Follow your {orders.length === 1 ? 'order' : 'orders'} from My orders. The tax invoice can be downloaded once an
          order has been dispatched.
        </Typography.Text>
      </Heading>

      {orders.map((order) => (
        <Card key={order.orderNumber} aria-label={`Order ${order.orderNumber}`}>
          <Row>
            <Muted>Order number</Muted>
            <Link to={PATHS.orderDetail(order.orderNumber)}>
              <strong>{order.orderNumber}</strong>
            </Link>
          </Row>
          <Row>
            <Muted>Order date</Muted>
            <span>{formatDate(order.placedAt)}</span>
          </Row>
          <Row>
            <Muted>Sold by</Muted>
            <span>{order.supplierName}</span>
          </Row>
          <Row>
            <Muted>Items</Muted>
            <span>{pluralise(order.items.reduce((sum, item) => sum + item.quantity, 0), 'item')}</span>
          </Row>
          {order.estimatedDeliveryAt && (
            <Row>
              <Muted>Estimated delivery</Muted>
              <span>{formatDate(order.estimatedDeliveryAt)}</span>
            </Row>
          )}
          <Row>
            <Muted>Order total</Muted>
            <span>{formatCurrency(order.total)}</span>
          </Row>
        </Card>
      ))}

      <Card aria-label="Payment and delivery">
        <Row>
          <Muted>Payment method</Muted>
          <span>{describePayment(payment)}</span>
        </Row>
        <Row>
          <Muted>Delivery address</Muted>
          <span>{`${delivery.streetAddress}, ${delivery.suburb} ${delivery.state} ${delivery.postcode}`}</span>
        </Row>
      </Card>

      <Total>
        <strong>{payment.status === 'paid' ? 'Total paid' : 'Total'}</strong>
        <Amount>{formatCurrency(total)}</Amount>
      </Total>

      <Flex justify="center" gap="middle">
        <Button size="large" onClick={() => navigate(PATHS.orderDetail(first.orderNumber))}>
          View order details
        </Button>
        <Button type="primary" size="large" onClick={() => navigate(PATHS.shop)}>
          Continue shopping
        </Button>
      </Flex>
    </Page>
  )
}

export default OrderConfirmationCard

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.margin}px;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.paddingXL}px ${({ theme }) => theme.padding}px;
`

const Heading = styled.div`
  text-align: center;

  h2.ant-typography {
    margin: ${({ theme }) => theme.marginXS}px 0 ${({ theme }) => theme.marginXXS}px;
  }
`

const Tick = styled.span`
  display: inline-grid;
  place-items: center;
  width: 56px;
  height: 56px;
  color: ${({ theme }) => theme.colorTextLightSolid};
  font-size: 28px;
  background: ${({ theme }) => theme.colorSuccess};
  border-radius: 50%;
  box-shadow: 0 0 0 8px ${({ theme }) => theme.colorSuccessBg};
`

const Card = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.marginSM}px;
  padding: ${({ theme }) => theme.padding}px;
  background: ${({ theme }) => theme.colorBgContainer};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;
`

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.margin}px;
`

const Muted = styled.span`
  color: ${({ theme }) => theme.colorTextSecondary};
`

const Total = styled(Card).attrs({ as: 'div' })`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`

const Amount = styled.span`
  font-size: ${({ theme }) => theme.fontSizeHeading3}px;
  font-weight: 700;
`
