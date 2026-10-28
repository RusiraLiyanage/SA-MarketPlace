# State and API

Redux Toolkit with **RTK Query** for everything that comes from the customer API (port 8001). Each feature has the Collection Manager's folder
shape: `actions.ts`, `slice.ts`, `selector.ts`, `types.ts`. **Where it lives follows the same rule as components:** a store used by one page sits in
that page's folder (`pages/Checkout/store/`, as the Collection Manager does); one used by two or more pages is shared and sits in `src/store/<feature>/`
(`auth`, `profile`, `cart`, `products`, `orders`). The one difference is inside `actions.ts`: it holds RTK Query
endpoints instead of `createAsyncThunk` calls, so there is no `extraReducers` copying responses into a slice and no hand-kept `isLoading` flags. RTK
Query generates the request, the loading and error state, the cache and the refetching.

## Layout

```
src/
├── infra/
│   ├── http.ts        base query: API URL, token header, ApiError, ends the session on a rejected token
│   ├── api.ts         the one createApi; features add endpoints to it, so it never grows
│   └── errors.ts      ApiError, ERROR_CODE, getErrorMessage
└── store/
    ├── index.ts       setupStore() (tests make their own) and the app's store
    ├── rootReducer.ts combineSlices(...); RootState is derived from it
    ├── hooks.ts       useAppDispatch, useAppSelector (typed)
    └── <feature>/       shared features; a page-only one has this same shape in pages/<Page>/store/
        ├── actions.ts   the feature's endpoints (api.injectEndpoints) and their hooks
        ├── slice.ts     client-only state; leave it out when the feature has none
        ├── selector.ts  reads of the slice, and derived values built from cached responses
        └── types.ts     request and state shapes (response shapes shared with the pages stay in src/types)
```

`store/auth/` also has `storage.ts` (the token in `sessionStorage`) and `listeners.ts` (keeps storage in step and clears the cache on sign-out).

## Decisions

- **No envelope.** The backend returns the body as it is on success, and `{ data: {}, error: 'ECB404', message }` on failure. The base
  query turns every failure, including a dropped connection, into one `ApiError` `{ status, code, message }`, so a component never
  parses a response. `.unwrap()` throws it; a hook's `error` is it.
- **The token lives in `sessionStorage`** (survives a refresh, not a closed tab, not shared between tabs) and is read into the store at start.
  There is no refresh token yet (backend ADR 0045): a 401 on a request that carried a token dispatches `sessionExpired()`, and the guard sends
  the buyer to sign in. A 401 without a token is only a failed sign-in and changes nothing.
- **Signing out, or expiring, clears the whole cache** (`auth/listeners.ts`), so the next person on the browser never sees the cart, orders or
  profile. Do not add a second place that does this.
- **Server data is not copied into slices.** If it came from the API it lives in the RTK Query cache; a slice is only for state the server
  does not have (for example the checkout address before it is submitted).
- **Refetch on focus and reconnect** is on, so a cart left open in another tab is current when the buyer returns.

## Auth (connected)

`store/auth/actions.ts` has login, register, logout, forgot and reset password. Login and register put the returned token in the session;
logout signs out locally even if the request fails. Pages do not navigate after signing in or out: the guards do it.

- `PrivateRoute` (everything after sign-in): no session sends the buyer to `/login`, remembering the page in `location.state.from`; an
  expired session goes to `/session-expired` first. After choosing to sign out nothing is remembered, so the next person is not sent to the last page.
- `PublicRoute` (sign-in pages): a signed-in buyer is sent to `from` (only if it is a path of this app) or the shop.
- The backend limits sign-in, registration and reset to 5 a minute per address; `AuthError` shows that as "Too many attempts".

## Profile (connected)

`store/profile/actions.ts`: `getProfile` (the header and My profile share one cached request), `updateProfile` (the answer is the whole updated profile
and replaces the cache, so no second request) and `changePassword` (the answer carries this session's new token, which is stored before the profile is
refetched: the old token no longer works). It has no slice or selector because it keeps nothing the server does not; `useOrganisationName()` is the
one derived read. The sample server in `test/server.ts` answers `GET /auth/profile` by default, since every signed-in page's header asks for it.

## Products (connected)

`store/products/actions.ts`: `listProducts`, `getProduct`, `getCategories`. The shop turns its URL query into the backend's with `toProductsRequest`
(sort choice to `orderField` and `order`). `selector.ts` has `useRelatedProducts`, the "You may also like" rule (same category first, topped up from the
rest; no endpoint for it, decided for Phase 1). Product images are `mediaUrl(path)` (the backend serves them at `/media/...`); a missing file falls back to the
category icon. The shop keeps the previous results on screen, dimmed, while a new filter loads.

A page whose breadcrumbs depend on its data calls `usePageCrumbs(...)` once loaded (the product page does, for its category and name); the route's own crumbs
show until then.

## Cart (connected)

`store/cart/actions.ts`: `getCart` plus `addCartItem`, `setCartItemQuantity`, `removeCartItem` and `clearCart` (`DELETE /cart`). Each change answers with the whole updated cart, which replaces
the cached one, so the header badge, the shop's steppers, the product page's stepper and the cart page all update from one response and no
second request. `useCartActions()` is what pages call (`add`, `setQuantity`, `remove`): it shows the backend's reason as a message when a change is refused
(not enough stock, a retired product) and leaves the cart as it was; `setQuantity` turns the first unit of a product into an add, since the backend can only
set a line that exists. `selector.ts` has the reads: `useCartQuantities()` (units by product) and `useCartCount()` (the badge).

Changes are not optimistic: the stepper moves when the backend has answered, so what is shown is always what the backend holds. The checkout will invalidate
the `Cart` tag when an order is placed.

## Checkout (connected)

`store/checkout/actions.ts`: `placeOrder` (`POST /checkout`). It is in `src/store` rather than `pages/Checkout/store` because two pages use it: the payment
step places the order and the confirmation page shows it. They share one placement through `fixedCacheKey` (`useLastCheckout()` in `selector.ts`), so there is no
slice and no second request; a reload loses it, and the confirmation then points to My orders. Placing an order invalidates `Cart`, `Profile`, `Product` and
`Order`: the cart is now empty, the order count went up, and stock came down.

`toPlaceOrderRequest` (in `pages/Checkout`) turns the form into the backend's body: the card's plain digits, month and full year, optional blanks left out, and no
country (the backend rejects fields it does not know). A declined card (`ECB402`) opens its pop-up; any other failure shows above the form, and a
conflict (an item retired or out of stock) adds a link to the cart. The empty-cart redirect is on the delivery step, not the frame, because placing the order
empties the cart while the buyer is still on the payment step.

## Orders (connected)

`store/orders/actions.ts`: `listOrders` (status, order-number `search`, paging), `getOrder`, `reorder` and `downloadInvoice`. Shared by My orders, the order page and
the reorder pop-up (which reads the order through the same cached `getOrder`). `reorder` answers with the updated cart, which replaces the cached cart, so the
header badge moves without another request. `downloadInvoice` is a mutation with its own `queryFn`: the PDF is saved as it arrives and never enters the
store; an error comes back as the backend's JSON (`responseHandler` reads the body as a file only when the response is ok). The file name comes from
`Content-Disposition`, which the backend exposes over CORS; without it the download falls back to `invoice-<number>.pdf`.

An order that belongs to someone else is a 404, as for a missing one (backend ADR 0025), so the page says "not found" for both.

## Adding a feature (the recipe)

1. `types.ts`: the request shapes (and the slice's state, if there is one).
2. `actions.ts`:

   ```ts
   export const productsApi = api.injectEndpoints({
     endpoints: (build) => ({
       listProducts: build.query<PaginatedData<ProductListItem>, ShopQuery>({
         query: ({ search, categoryId, priceRange, sort, page, limit }) => ({ url: '/products', params: { search, categoryId, ... } }),
         providesTags: ['Product'],
       }),
     }),
   })
   export const { useListProductsQuery } = productsApi
   ```

   A mutation lists what it changes (`invalidatesTags: ['Cart']`) and every query that provides that tag refetches by itself.
3. `slice.ts` only if the feature has state the server does not (for example the checkout address before it is submitted); register it in
   `rootReducer.ts`. `selector.ts` for its reads and for values derived from a cached response.
4. The page calls the hook (`const { data, isLoading, error } = useListProductsQuery(query)`).
5. Check it in the browser against the running API; there is no fake backend. Pure logic (query building, mappers) gets unit tests.
6. Add a tag to `tagTypes` in `infra/api.ts` only when a feature needs a new one.
