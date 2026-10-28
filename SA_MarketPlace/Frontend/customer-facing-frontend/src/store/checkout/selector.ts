import { PLACE_ORDER_KEY, usePlaceOrderMutation } from 'src/store/checkout/actions'

/** What the buyer's last checkout placed, or undefined when there is none (never placed, or the page was reloaded). */
export const useLastCheckout = () =>
  usePlaceOrderMutation({ fixedCacheKey: PLACE_ORDER_KEY, selectFromResult: ({ data }) => ({ data }) })[1].data
