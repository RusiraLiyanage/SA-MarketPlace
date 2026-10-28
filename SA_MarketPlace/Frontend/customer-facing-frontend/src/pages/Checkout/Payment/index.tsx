import { Button, Checkbox } from 'antd'
import { useState } from 'react'
import { Navigate, Outlet, useNavigate, useOutletContext } from 'react-router'
import type { CheckoutOutletContext } from 'src/pages/Checkout/checkoutOutletContext'
import CheckoutColumns from 'src/pages/Checkout/components/CheckoutColumns'
import CheckoutSummary from 'src/pages/Checkout/components/CheckoutSummary'
import DeliverySummary from 'src/pages/Checkout/Payment/components/DeliverySummary'
import PaymentForm from 'src/pages/Checkout/Payment/components/PaymentForm'
import { ERROR_CODE, isApiError } from 'src/infra/errors'
import { toPlaceOrderRequest } from 'src/pages/Checkout/placeOrderRequest'
import PlaceOrderError from 'src/pages/Checkout/Payment/components/PlaceOrderError'
import { PATHS } from 'src/router/paths'
import { PLACE_ORDER_KEY, usePlaceOrderMutation } from 'src/store/checkout/actions'
import { useOrganisationName } from 'src/store/profile/actions'

const FORM_ID = 'payment-form'

const PaymentPage = () => {
  const navigate = useNavigate()
  const { cart, delivery } = useOutletContext<CheckoutOutletContext>()
  const organisationName = useOrganisationName()
  const [purposeConfirmed, setPurposeConfirmed] = useState(false)
  const [placeOrder, { isLoading, error }] = usePlaceOrderMutation({ fixedCacheKey: PLACE_ORDER_KEY })

  // Payment comes after delivery: someone who lands here first is sent back to enter an address.
  if (!delivery) return <Navigate to={PATHS.checkoutDelivery} replace />

  return (
    <CheckoutColumns
      aside={
        <CheckoutSummary cart={cart}>
          <Checkbox checked={purposeConfirmed} onChange={(event) => setPurposeConfirmed(event.target.checked)}>
            I confirm this order is for legitimate workplace drug testing purposes.
          </Checkbox>
          <Button type="primary" size="large" block htmlType="submit" form={FORM_ID} disabled={!purposeConfirmed} loading={isLoading}>
            Place order
          </Button>
        </CheckoutSummary>
      }
    >
      <DeliverySummary
        delivery={delivery}
        organisationName={organisationName ?? ''}
        onEdit={() => navigate(PATHS.checkoutDelivery)}
      />
      <PlaceOrderError error={error} />
      <PaymentForm
        formId={FORM_ID}
        onSubmit={async (payment) => {
          try {
            const { orders } = await placeOrder(toPlaceOrderRequest(delivery, payment)).unwrap()
            navigate(PATHS.orderConfirmation(orders[0]!.orderNumber))
          } catch (failure) {
            // A refused card is part of the flow, not a fault: the pop-up offers another card. Anything else shows above.
            if (isApiError(failure) && failure.code === ERROR_CODE.paymentRequired) navigate(PATHS.paymentDeclined)
          }
        }}
      />
      <div>
        <Button size="large" onClick={() => navigate(PATHS.checkoutDelivery)}>
          Back to delivery
        </Button>
      </div>
      <Outlet />
    </CheckoutColumns>
  )
}

export default PaymentPage
