import { Steps } from 'antd'
import { useLocation } from 'react-router'
import { PATHS } from 'src/router/paths'

const STEPS = [{ title: 'Cart' }, { title: 'Delivery' }, { title: 'Payment' }, { title: 'Confirmation' }]

// Cart is always done; the current step follows the URL (Confirmation is its own page, so it is never current here).
const CheckoutStepper = () => {
  const { pathname } = useLocation()
  const current = pathname.startsWith(PATHS.checkoutPayment) ? 2 : 1

  return <Steps current={current} items={STEPS} />
}

export default CheckoutStepper
