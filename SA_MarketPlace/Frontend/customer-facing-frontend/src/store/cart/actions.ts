import { App } from 'antd'
import { api } from 'src/infra/api'
import { getErrorMessage } from 'src/infra/errors'
import type { AddCartItemRequest, SetCartItemQuantityRequest } from 'src/store/cart/types'
import type { Cart } from 'src/types'

// Every change to the cart answers with the whole updated cart, which replaces the cached one: the header badge, the shop's
// steppers and the cart page all update from that single response, with no second request.
const keepCart = async (queryFulfilled: Promise<{ data: Cart }>, replace: (cart: Cart) => void) => {
  const { data } = await queryFulfilled.catch(() => ({ data: undefined }))
  if (data) replace(data)
}

export const cartApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCart: build.query<Cart, void>({
      query: () => '/cart',
      providesTags: ['Cart'],
    }),
    addCartItem: build.mutation<Cart, AddCartItemRequest>({
      query: (body) => ({ url: '/cart/items', method: 'POST', body }),
      onQueryStarted: (_arg, { dispatch, queryFulfilled }) =>
        keepCart(queryFulfilled, (cart) => dispatch(cartApi.util.updateQueryData('getCart', undefined, () => cart))),
    }),
    setCartItemQuantity: build.mutation<Cart, SetCartItemQuantityRequest>({
      query: ({ productId, quantity }) => ({ url: `/cart/items/${productId}`, method: 'PATCH', body: { quantity } }),
      onQueryStarted: (_arg, { dispatch, queryFulfilled }) =>
        keepCart(queryFulfilled, (cart) => dispatch(cartApi.util.updateQueryData('getCart', undefined, () => cart))),
    }),
    clearCart: build.mutation<Cart, void>({
      query: () => ({ url: '/cart', method: 'DELETE' }),
      onQueryStarted: (_arg, { dispatch, queryFulfilled }) =>
        keepCart(queryFulfilled, (cart) => dispatch(cartApi.util.updateQueryData('getCart', undefined, () => cart))),
    }),
    removeCartItem: build.mutation<Cart, string>({
      query: (productId) => ({ url: `/cart/items/${productId}`, method: 'DELETE' }),
      onQueryStarted: (_arg, { dispatch, queryFulfilled }) =>
        keepCart(queryFulfilled, (cart) => dispatch(cartApi.util.updateQueryData('getCart', undefined, () => cart))),
    }),
  }),
})

export const {
  useGetCartQuery,
  useAddCartItemMutation,
  useSetCartItemQuantityMutation,
  useRemoveCartItemMutation,
  useClearCartMutation,
} = cartApi

/**
 * What a page does to the cart. A refused change (not enough stock, a retired product) is shown as a message and the cart
 * stays as it was, so a component only says what the buyer asked for. Resolves true when the change went through.
 */
export const useCartActions = () => {
  const { message } = App.useApp()
  const { data: cart } = useGetCartQuery()
  const [addItem] = useAddCartItemMutation()
  const [setItemQuantity] = useSetCartItemQuantityMutation()
  const [removeItem] = useRemoveCartItemMutation()
  const [clearCart] = useClearCartMutation()

  const attempt = async (request: { unwrap: () => Promise<unknown> }) => {
    try {
      await request.unwrap()
      return true
    } catch (error) {
      message.error(getErrorMessage(error))
      return false
    }
  }

  return {
    add: (productId: string, quantity = 1) => attempt(addItem({ productId, quantity })),
    // The backend can only set a line that exists, so the first unit of a product is an add.
    setQuantity: (productId: string, quantity: number) =>
      attempt(
        !cart?.items.some((item) => item.productId === productId)
          ? addItem({ productId, quantity })
          : setItemQuantity({ productId, quantity }),
      ),
    remove: (productId: string) => attempt(removeItem(productId)),
    clear: () => attempt(clearCart()),
  }
}
