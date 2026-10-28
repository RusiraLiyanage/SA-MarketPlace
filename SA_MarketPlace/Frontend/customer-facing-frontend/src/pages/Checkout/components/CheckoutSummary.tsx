import type { ReactNode } from 'react'
import OrderSummaryCard from 'src/components/OrderSummaryCard'
import type { Cart } from 'src/types'

// The order summary on both checkout steps: the lines being ordered, then the totals.
const CheckoutSummary = ({ cart, children }: { cart: Cart; children: ReactNode }) => (
  <OrderSummaryCard
    summary={cart.summary}
    lines={cart.items
      .filter((item) => item.unavailableReason === null)
      .map(({ name, quantity, lineTotal }) => ({ name, quantity, lineTotal }))}
  >
    {children}
  </OrderSummaryCard>
)

export default CheckoutSummary
