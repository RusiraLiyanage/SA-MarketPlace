import { Button } from 'antd'
import { Navigate, useNavigate, useOutletContext } from 'react-router'
import type { CheckoutOutletContext } from 'src/pages/Checkout/checkoutOutletContext'
import CheckoutColumns from 'src/pages/Checkout/components/CheckoutColumns'
import CheckoutSummary from 'src/pages/Checkout/components/CheckoutSummary'
import DeliveryForm from 'src/pages/Checkout/Delivery/components/DeliveryForm'
import { PATHS } from 'src/router/paths'
import { useOrganisationName } from 'src/store/profile/actions'

const FORM_ID = 'delivery-form'

const DeliveryPage = () => {
  const navigate = useNavigate()
  const { cart, delivery, setDelivery } = useOutletContext<CheckoutOutletContext>()
  const organisationName = useOrganisationName()

  // Nothing to check out: the cart was emptied, or never had anything in it.
  if (cart.items.length === 0) return <Navigate to={PATHS.cart} replace />

  return (
    <CheckoutColumns
      aside={
        <CheckoutSummary cart={cart}>
          <Button type="primary" size="large" block htmlType="submit" form={FORM_ID}>
            Continue to payment
          </Button>
        </CheckoutSummary>
      }
    >
      <DeliveryForm
        formId={FORM_ID}
        organisationName={organisationName ?? ''}
        initialValues={delivery}
        onSubmit={(values) => {
          setDelivery(values)
          navigate(PATHS.checkoutPayment)
        }}
      />
      <div>
        <Button size="large" onClick={() => navigate(PATHS.cart)}>
          Back to cart
        </Button>
      </div>
    </CheckoutColumns>
  )
}

export default DeliveryPage
