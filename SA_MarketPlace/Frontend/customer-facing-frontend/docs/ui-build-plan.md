# UI build plan — customer marketplace

> **History.** This is the log of the first phase, when every screen was built from sample JSON. That sample data, the fake backend and the page tests
> that ran on them have since been removed: every screen now reads from the API (`docs/state-and-api.md`). Mentions of `mocks/`, `src/test/fixtures`,
> `renderApp`, MSW and test counts below describe that phase and no longer exist.

Goal of this phase: every screen built with Ant Design from the designs, reading only from sample data. No store, no API.
Designs: `Intern Project/Updated Designs/Customer-Facing` (13 screens). Where a design and the backend disagree, the backend wins.

## How each step is done

1. Replace the placeholders for that step's screens, using the shared components first.
2. Read data from `src/test/fixtures`; never hard-code values in a component.
3. Build every state the design shows (default, empty, loading, error, disabled) and the ones the backend implies.
4. Check against the design at 1440px wide.
5. Done when `pnpm typecheck`, `pnpm lint` and `pnpm build` pass, the screen's routes (and modals) work in the browser, and its
   components have tests.
6. One small pull request per step, self-reviewed.

## Step 0 — Foundations (done)

| Work | Result |
|---|---|
| Test setup | Vitest and Testing Library (jsdom); `pnpm test`. 29 tests cover the shared parts and helpers |
| Styling approach | **styled-components**, written at the bottom of the component file as in Collection Manager. `ThemeBridge` passes the Ant Design tokens to styled-components (`${({ theme }) => theme.colorPrimary}`), so both read one theme |
| Theme and font | `styles/theme.ts` (tokens, 38px controls, white header), Inter from the `@fontsource-variable/inter` package (served locally), `styles/globalStyles.ts` |
| Assets | `SALogo` (the design's check-square mark), `SAProductImage` (category icon until images are served) |
| `utils/format.ts` | `formatCurrency` (AUD), `formatDate` ("25 Jul 2026", Sydney time), `initials`, `pluralise` |
| Shared parts | `SAStatusTag`, `SAStockTag`, `SAQuantityStepper`, `SAPagination`, `SAEmpty`, plus `SATable`, `SABreadcrumb`, `SADialog` |

## Step 1 — Shell (done)

| Part | Result |
|---|---|
| `Header` | `HeaderLogo`, `HeaderNav` (Shop and My Orders tabs; Shop stays active on the cart and checkout, none on the profile page), `HeaderCartButton` (badge = units in the cart), `HeaderProfileMenu` (initials, name, organisation; My profile and Sign out) |
| Layouts | `MainLayout` (header, breadcrumb, page), `AuthLayout` with `AuthHeader` (its right-hand prompt switches between "Create an account" and "Sign in"), `PageLayout` (padded title block) |
| `SABreadcrumb` | Now the white bar under the header |
| Errors | `SAErrorPage` is the one look for 404, 403, 500 and the router's error boundary |
| Tests | 48 in total; the header tabs, cart badge, account menu, auth prompt, layout and error page are covered |

Checked in the browser at 1440px against the designs. The header reads the profile and cart from `src/test/fixtures` for now.

## Step 2 — Auth (done)

| Screen | Result |
|---|---|
| 10 Login | `LoginForm` (email, password, forgot link). **"Keep me signed in" is left out**: it is not supported yet (ADR 0045), so showing it would mislead. Add it back when the decision is made |
| 11 Register | `RegisterForm`. The password hint and check use the backend rule (8+ characters with upper, lower, number and symbol), not the design's "one number". Confirm password is checked in the browser only. Terms checkbox required |
| Forgot password | `ForgotPasswordPage`: the confirmation never says whether the account exists, as the backend does |
| Reset password | `ResetPasswordPage` reads `?token=`; no token shows "This reset link is invalid or has expired" |
| Session expired | `SessionExpiredModal`: the only way on is to sign in again |

Shared: `AuthPanel` (heading above a white card), `utils/formRules.ts` (rules and limits that match the backend),
`patterns/patterns.ts` (the password pattern, copied from the backend and tested), `utils/requiredMark.tsx` (the asterisk after the label, as in the designs).
Each form takes an optional `onSubmit`; the store will pass the real one. 77 tests in total.

## Step 3 — Shop (done; screens 1, 8, 9)

| Part | Result |
|---|---|
| `HeroSearchBanner` | Title, subtitle without the "at your organisation's pricing" wording, search box with a Search button |
| `CategoryFilter`, `PriceRangeFilter` | Single-choice chips (`SAChipGroup`, new and shared with My Orders later): All plus the categories, and Any price / Under $20 / $20 - $50 / $50+ |
| `SortSelect` | Name A-Z / Z-A, Price low-high / high-low, Newest (the backend's sort fields) |
| `ProductResultsHeader`, `ProductGrid`, `SAPagination` | Count, four-column grid with an empty state ("Clear filters"), "N of M" pager with 10 / 20 / 30 per page |
| `ProductCard` + `AddToCartControl` (shared) | "Verified" tag, name, supplier, price, stock tag. Plain **Add to cart** until the item is in the cart, then the stepper and a blue border; reducing to 0 brings the button back. Out of stock shows **Notify me** |
| Out of stock | A disabled **Out of stock** button. A "Notify me" pop-up was built first, but with no backend it promised an alert that never came, so it was removed |

Search, category, price range, sort, page and page size live in the URL (`?search=&categoryId=&priceRange=&sort=&page=&limit=`), named after the
backend's query, so a filtered view can be shared and survives a refresh; changing a filter goes back to page 1.
`mocks/queryProducts.ts` applies the same filters, sort and paging the backend does (including its price bounds) until the store replaces it, and the page keeps a
local cart quantity map for the stepper. The sample cart already holds three of the products, so those cards open in the stepper state, as the backend would show.
114 tests in total.

## Step 4 — Product detail (done; screen 2)

| Part | Result |
|---|---|
| Breadcrumb | Home, the product's category (links to the filtered shop), the product name |
| `ProductGallery` | Large image with the "Verified Seller" tag and four thumbnails; picking one moves the selection |
| `ProductInfo` | Category, name, SKU, supplier, stock tag, price with "GST inclusive · per unit", the cards' own `AddToCartControl`: a plain Add to cart button, the stepper once the product is in the cart (0 brings the button back). Out of stock shows a disabled button. The design's "your organisation price" line is dropped (Phase 2) |
| `SupplierCard` | Initial, name, "Verified marketplace supplier". No rating |
| Description and `ProductSpecifications` | `SATable` of category, SKU, pack size, brand / manufacturer (named once when they are the same), certification, storage, shelf life ("24 months"). Blank fields are left out; no sub-category |
| `RelatedProducts` | Four short cards (`ProductCard compact`: name, price, quiet Add to cart), same category first, never the product itself |
| Unknown product | "Product not found", as the backend's 404 |

Every product in the sample catalogue has a detail record (`mocks/product-details.json`, looked up with `getMockProductDetail`). 144 tests in total.

## Step 5 — Cart (done; screen 3)

| Part | Result |
|---|---|
| Page | "Shopping cart" with "N items from M suppliers" (units and distinct suppliers), the table beside the order summary |
| `CartItemsTable` | `SATable`: product (name links to the product page), quantity stepper capped at the stock on hand, unit price, line total, Remove. **No SKU**: the cart response does not carry one |
| Reducing to 0 | Asks first, in the remove pop-up, rather than silently deleting |
| `RemoveCartItemModal` | Route `/cart/remove/:productId` over the cart; it names the item, and Remove deletes the line. The cart hands it the items and `onRemove` through `<Outlet context>` |
| `OrderSummaryCard` (shared, also for checkout) | Subtotal (N items), GST (incl.) = total ÷ 11, Delivery Free, Total; the buttons are passed in. Checkout passes `lines` to list the items |
| States | Empty cart ("Browse the shop"); a line with `unavailableReason` shows why, is struck through, cannot change quantity and is left out of the totals; checkout is disabled when nothing can be ordered |

`utils/money.ts` is the backend's whole-cents maths, and `mocks/cartMath.ts` recomputes the summary after a change, standing in for the PATCH and DELETE calls until the store exists. 171 tests in total.

## Step 6 — Checkout (done; screens 4, 4b, 5)

| Part | Result |
|---|---|
| Frame | `CheckoutLayout`: title, `CheckoutStepper` (Cart done, Delivery, Payment, Confirmation, following the URL) and the order being placed. The address entered so far is held here and shared with the steps through `<Outlet context>`; an empty cart goes back to the cart |
| `DeliveryForm` | Attention name, organisation and country (fixed), street address, suburb, state (the backend's list, starting on NSW), postcode (4 digits), notes. The Continue button lives in the order summary and submits the form by its id |
| `CheckoutSummary` | `OrderSummaryCard` with the lines being ordered |
| Payment | `DeliverySummary` (with Edit), `PaymentForm`: card (mock) or invoice on account. **Name on card is added**: the backend requires it and the design omitted it. Card number is grouped as typed and checked with the same Luhn test as the backend; expiry is `MM / YY` and must not be past; CVC 3 or 4 digits. The sandbox notice is an information banner |
| Place order | Disabled until "I confirm this order is for legitimate workplace drug testing purposes" is ticked (not pre-ticked), with the reason sitting beside it. The sample gateway approves any valid card and declines `4000 0000 0000 0002`; payment without the address goes back to Delivery |
| `PaymentDeclinedModal` | Route `/checkout/payment/declined` over the payment step; "Try another card" returns to the form |
| 5 Order confirmation | One block per order (a cart with several suppliers is placed as several), the payment method, delivery address and total paid. The design's "tax invoice has been sent to your account" is replaced: there is no email, and the invoice can be downloaded once the order is dispatched |

`utils/card.ts` (formatting, Luhn, expiry), `utils/payment.ts` and `mocks/placeMockOrder.ts` (the sample gateway). A new `renderApp` test helper walks the real route tree, and the checkout tests cover delivery to payment to confirmation, the declined card and invoice on account end to end. 224 tests in total.

## Step 7 — My Orders (done; screen 6)

| Part | Result |
|---|---|
| `OrderFilters` | Search box (order number, Enter to search) and the status chips All / Placed / Confirmed / Dispatched / Delivered (`SAChipGroup`) |
| `OrdersTable` | `SATable`: order number (links to the order), date, items (lines, not units), supplier, total, `SAStatusTag`, View details, Reorder. Newest first. "Picking" shows as Confirmed |
| States | No orders yet ("Browse the shop"); nothing matches the search or status ("Clear filters"); the pager is hidden when there are no orders |
| `ReorderConfirmModal` | Routes `/orders/reorder/:orderNumber` and `/orders/:orderNumber/reorder`. It first lists the items and says they are added at today's prices and nothing is ordered; confirming shows the backend's per-line result: all added (success, "Go to cart"), some skipped (warning, each with its reason) or none added (error, Close only). An unknown order says so and cannot be confirmed |

Search, status, page and page size live in the URL (`?search=&status=&page=&limit=`), as on the shop. **The backend now has an order-number search**
(`GET /orders?search=`, added when the orders were connected), so the box works against the real API. The sample data now has an old order (ORD-2026-00071) for an out-of-stock product, so the
"none added" state can be seen. `mocks/queryOrders.ts` and `mocks/reorderMock.ts` stand in for `GET /orders` and `POST /orders/:orderNumber/reorder`. 246 tests in total.

## Step 8 — Order detail (done; screen 7)

| Part | Result |
|---|---|
| Title block | "Order ORD-…" with "Placed on … · Sold by …" (`PageLayout`); `OrderActions` on the right replaces the planned `OrderDetailHeader` |
| `OrderActions` | **Download invoice** is enabled only when dispatched or delivered; before that it is off with "The invoice is available once the order is dispatched." beside it. Reorder opens the pop-up at `/orders/:orderNumber/reorder`, and closing returns to the order. The download only shows a notice until the API is connected |
| `OrderProgressSteps` | Order placed, Confirmed, Dispatched, Delivered, done steps in green; "picking" counts as Confirmed. A cancelled order shows an error banner with its reason instead |
| `ShipmentInfo` | Carrier, tracking (with copy), dispatched, est. delivery, plus Delivered once it has arrived. Blank ("—") until dispatch, with a line saying when it fills in. Tracking is plain text: the backend gives no tracking link |
| `OrderItemsTable` | `SATable` of product (with SKU), qty, unit price and total at the frozen prices, then Subtotal (excl. GST), GST and Total as the tax invoice splits them |
| `DeliveryAddressCard` | Organisation (from the profile; the order's address does not carry it), attention name, address, notes, then the payment method and its status (paid date, pending, …). **No PO number**: there is no backend field |
| Not found | "We could not find that order", as the backend's 404 |

`mocks/order-details.json` now has a detail for each sample order (placed, dispatched, two delivered), and a test checks each one's lines add up to the total shown in My orders. 259 tests in total.

## Step 9 — Profile (done; screen 12)

| Part | Result |
|---|---|
| `PersonalDetailsForm` | First name, last name and phone are editable (`PATCH /auth/profile` takes only these, ADR 0028). Email and organisation are shown but disabled, each saying it can't be changed here. **Phone can be changed but not cleared**: the backend rejects an empty value, so once a number is set the field is required |
| `ChangePasswordForm` | **New password and confirm only**, checked with the backend's rule. The design's "Current password" input is replaced by a read-only row of dots, sized by `passwordLength`, because the backend never asks for it (ADR 0030). A note says other devices are signed out |
| `ProfileSummaryCard` | Initials, name, roles and organisation ("Buyer, Collection Manager · SA Clinics Pty Ltd"), Member since (month and year), Orders placed, link to My orders |
| `SessionCard` | Sign out opens the pop-up. The design's "Signed in on this device only." is replaced: signing out ends every session on the account (ADR 0018) |
| `SignOutConfirmModal` | Route `/profile/sign-out` over the profile page (the header menu opens it from any page). Confirming goes to sign in; there is no auth state yet |

Saving and the password change act on the sample profile and show a notice; the store will make them `PATCH /auth/profile` and `POST /auth/change-password` (whose response carries this session's fresh token).
The test helpers now wrap pages in Ant Design's `App`, as `App.tsx` does, so `message` works in tests. 269 tests in total.

## Step 10 — Polish (done)

Checked every route in the browser at 1440px with [axe-core](https://github.com/dequelabs/axe-core) (colour contrast included), the console and the keyboard.

| Area | Result |
|---|---|
| Page names | Each route has a title ("Sample Assist Marketplace · Shop", the order number on an order, "Page not found"…) from `handle.title` or its last breadcrumb. `RootLayout` sets the tab title and announces the new page in a polite live region, since the app never reloads. A pop-up keeps the page it opens over |
| Landmarks and keyboard | "Skip to main content" is the first tab stop in both layouts and moves to `<main>`. One `h1` per page and `h2` for each card (`SAPageTitle`, `SASectionTitle`: same look as the designs, real outline). The product picture's link is out of the tab order (its name links to the same page). Pop-ups are named dialogs and take focus. No keyboard traps |
| Names and labels | The logo and account menu are named by their visible text; the read-only email, organisation and country fields have labels |
| Colour contrast | Muted text `#666` (was `#8c8c8c`), links and selected tab `#0958d9`, danger red `#cf1322`, and tags use dark text on their tint (`SAToneTag`; the old green, amber and red tags were 1.8 to 3:1). Success, warning and error fills stay as designed. Inline links are underlined |
| Loading | A thin bar under the top of the page while the next page's code loads (`RootLayout`), and the first load shows a page-shaped skeleton (`SASplashScreen`) instead of a spinner. The sample data is instant, so per-screen data skeletons are not built yet: they come with the store, as each feature's `status` (`SATable` already takes `loading`) |
| Empty and error states | Every screen has one: shop (no match), cart (empty), My orders (none yet, no match), product, order and confirmation (not found), reset link (invalid), and the 403, 404 and 500 pages, now with an `h1` and a tab title. Checks: an empty cart sends checkout back to the cart, and payment without an address goes back to delivery |
| Console | No errors or warnings (the three `Alert message` deprecations are now `title`) |
| Tests | `__tests__/Accessibility.test.tsx` runs axe on every page and pop-up (structure, not colour: jsdom has no layout) and checks the titles, announcer and skip link. 297 tests in total |

**Primary blue changed to `#0958d9`** (the designs' `#1677ff` gave white text 4.1:1, under the 4.5:1 AA minimum for normal text; `#0958d9` gives 6.5:1). It is one token, `colorPrimary` in `styles/theme.ts`, and every button, chip, link and the shop banner follow it.
Not covered: mobile layouts (Phase 2) and a screen-reader pass with a real reader.

## Design points to settle before building

| Point | Proposal |
|---|---|
| "At your organisation's pricing" (hero) and "Your organisation price" (product page) | Customer-specific pricing is out of Phase 1: drop the wording |
| "98% positive" supplier rating | Leave out |
| "Notify me" on out-of-stock | Not offered until back-in-stock alerts exist (a table, an endpoint, and an email when a supplier restocks) |
| "Delivery: Free" and estimated delivery as a date range | Show "Free" as designed; show the single estimated date the backend returns |
| "A confirmation and tax invoice have been sent to your account" | Reword: there is no email, the invoice is downloaded from the order |

## Decision: "You may also like" uses the existing list endpoint

There is no related-products endpoint and none is planned for Phase 1. The product feature will call `GET /products?categoryId=<this product's category>&limit=5`,
drop the product being viewed, and, if fewer than four remain, make one more call without the category to fill the gaps. This is what the page already
does on the sample data (same category first, then the rest). A `/products/:id/related` endpoint can replace it in Phase 2 if ranking is wanted (for example by
what other buyers ordered), without changing what the page renders.

## After this phase

Redux store per feature (`slice`, `action`, `selector`, `types`, as in Collection Manager), the API client against the customer
API on port 8001, turn the route guards on, replace each mock export with a selector, and move on to the seller portal.
