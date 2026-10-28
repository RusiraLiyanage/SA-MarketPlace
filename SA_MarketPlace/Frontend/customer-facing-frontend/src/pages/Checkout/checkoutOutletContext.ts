import type { Cart } from 'src/types'

export interface DeliveryValues {
  attentionName?: string
  streetAddress: string
  suburb: string
  state: string
  postcode: string
  notes?: string
}

// What the checkout frame hands to its steps through <Outlet context>.
export interface CheckoutOutletContext {
  cart: Cart
  delivery?: DeliveryValues
  setDelivery: (delivery: DeliveryValues) => void
}
