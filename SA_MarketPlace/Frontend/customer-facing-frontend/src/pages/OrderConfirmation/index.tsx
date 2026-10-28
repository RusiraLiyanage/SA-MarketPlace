import { Button } from 'antd'
import { useNavigate, useParams } from 'react-router'
import SAEmpty from 'src/components/SAEmpty'
import OrderConfirmationCard from 'src/pages/OrderConfirmation/components/OrderConfirmationCard'
import { PATHS } from 'src/router/paths'
import { useLastCheckout } from 'src/store/checkout/selector'

// Shows what the checkout just placed. After a reload there is nothing to show (the result is not kept), so it points to My
// orders, where every order stays.
const OrderConfirmationPage = () => {
  const { orderNumber } = useParams()
  const navigate = useNavigate()
  const result = useLastCheckout()

  if (!result?.orders.some((order) => order.orderNumber === orderNumber)) {
    return (
      <SAEmpty
        title="We could not find that order"
        description="Check My orders to see everything you have placed."
        action={
          <Button type="primary" onClick={() => navigate(PATHS.orders)}>
            Go to My orders
          </Button>
        }
      />
    )
  }

  return <OrderConfirmationCard result={result} />
}

export default OrderConfirmationPage
