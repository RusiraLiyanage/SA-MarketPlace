import { api } from 'src/infra/api'
import type { PlaceOrderRequest } from 'src/store/checkout/types'
import type { CheckoutResult } from 'src/types'

// The checkout page and the confirmation page share one placement through this key, so the confirmation reads what the
// checkout placed without a slice or a second request.
export const PLACE_ORDER_KEY = 'place-order'

export const checkoutApi = api.injectEndpoints({
  endpoints: (build) => ({
    // One order per supplier. Placing them empties the cart, changes the buyer's order count and takes stock, so each of
    // those is read again.
    placeOrder: build.mutation<CheckoutResult, PlaceOrderRequest>({
      query: (body) => ({ url: '/checkout', method: 'POST', body }),
      invalidatesTags: ['Cart', 'Profile', 'Product', 'Order'],
    }),
  }),
})

export const { usePlaceOrderMutation } = checkoutApi
