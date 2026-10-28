import { useGetCartQuery } from 'src/store/cart/actions'

/** Units in the cart by product id; empty until the cart has loaded. */
export const useCartQuantities = (): Record<string, number> =>
  useGetCartQuery(undefined, {
    selectFromResult: ({ data }) => ({
      quantities: Object.fromEntries((data?.items ?? []).map((item) => [item.productId, item.quantity])),
    }),
  }).quantities

/** The number the header badge shows: units that can be ordered, as the backend's summary counts them. */
export const useCartCount = (): number =>
  useGetCartQuery(undefined, { selectFromResult: ({ data }) => ({ count: data?.summary.itemCount ?? 0 }) }).count
