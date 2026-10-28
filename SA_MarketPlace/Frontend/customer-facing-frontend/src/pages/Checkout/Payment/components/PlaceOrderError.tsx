import { Alert, Button } from 'antd'
import { Link } from 'react-router'
import { ERROR_CODE, getErrorMessage, isApiError } from 'src/infra/errors'
import { PATHS } from 'src/router/paths'

// Why the order was not placed. A declined card has its own pop-up, so it is not shown here. A cart that changed since it
// was filled (a product retired, stock gone) is fixed in the cart, so that is where this points.
const PlaceOrderError = ({ error }: { error: unknown }) => {
  if (!error || (isApiError(error) && error.code === ERROR_CODE.paymentRequired)) return null

  const cartChanged = isApiError(error) && error.code === ERROR_CODE.conflict
  return (
    <Alert
      showIcon
      type="error"
      title="Your order was not placed"
      description={getErrorMessage(error)}
      action={
        cartChanged && (
          <Link to={PATHS.cart}>
            <Button size="small">Review your cart</Button>
          </Link>
        )
      }
    />
  )
}

export default PlaceOrderError
