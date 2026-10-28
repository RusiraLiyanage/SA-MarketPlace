import { useState } from 'react'
import { Outlet } from 'react-router'
import PageLayout from 'src/components/layouts/PageLayout'
import SALoadError from 'src/components/SALoadError'
import SASkeleton from 'src/components/SASkeleton'
import type { CheckoutOutletContext, DeliveryValues } from 'src/pages/Checkout/checkoutOutletContext'
import CheckoutStepper from 'src/pages/Checkout/components/CheckoutStepper'
import { useGetCartQuery } from 'src/store/cart/actions'

// The frame shared by the delivery and payment steps: the title and progress. The cart comes from the cart store, and the
// delivery address entered so far lives here (it is held between the two steps, not saved). An empty cart is the delivery
// step's concern, not this frame's: placing the order empties the cart while the buyer is still on the payment step.
const CheckoutLayout = () => {
  const [delivery, setDelivery] = useState<DeliveryValues>()
  const { data: cart, error, isLoading, refetch } = useGetCartQuery()

  if (isLoading) {
    return (
      <PageLayout title="Checkout">
        <SASkeleton rows={8} />
      </PageLayout>
    )
  }

  if (!cart) {
    return (
      <PageLayout title="Checkout">
        <SALoadError what="your cart" error={error} onRetry={refetch} />
      </PageLayout>
    )
  }

  const context: CheckoutOutletContext = { cart, delivery, setDelivery }

  return (
    <PageLayout title="Checkout">
      <CheckoutStepper />
      <Outlet context={context} />
    </PageLayout>
  )
}

export default CheckoutLayout
