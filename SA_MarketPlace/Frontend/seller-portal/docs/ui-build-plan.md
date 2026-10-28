# Seller portal — implementation plan

Plan for this app, `Frontend/seller-portal`, the supplier-facing app on `supplier-api` (port 8002). It follows the structure and rules of the customer
marketplace (`customer-facing-frontend`), with a **left sidebar instead of a top bar**. Designs: 19 seller frames in the
[Figma file](https://www.figma.com/design/i3v2ts6Ig7O874InEAL899/Device-Management-Designs---Rusira) (`Seller_-_0` to `Seller_-_9`) and the screenshots
shared in chat. Where a design and the backend disagree, **the backend wins** (section 4 is the full list).

Status: **steps 0 (backend CORS header), 1 (scaffold), 2 (auth), 3 (application status), 4 (dashboard), 5 (orders), 6 (catalogue list), 7 (add and edit product), 8 (business profile) and 9 (polish) are done**. The four open decisions are settled (section 8).
Every page below is built; the placeholder component that stood in for them is gone.

---

## 1. Scope

In: sign-in, register, forgot/reset password, the three application-status screens, dashboard, orders (list, fulfilment, dispatch, cancel,
invoice), catalogue (list, add/edit product with images, retire), business profile, sign-out. All connected to the real API.

Out (Phase 2 or later, per `CLAUDE.md`): "keep me signed in", commissions and settlements, sales analytics, supplier offboarding or
suspension, Store Link, multi-user seller accounts, marking an order delivered (the backend does not do it yet), mobile layouts.

## 2. Screens, routes and endpoints

Base URL `VITE_API_URL=http://localhost:8002/api/supplier/v1`. The reset-link address is already set in the backend: `SUPPLIER_RESET_URL=http://localhost:5174/reset-password`,
so the app runs on **port 5174**.

| Design screen | Route | Endpoints |
|---|---|---|
| 0 Login | `/login` | `POST auth/login` |
| 0b Forgot password, 0c Reset link sent (a state of the same page) | `/forgot-password` | `POST auth/forgot-password` |
| Reset password (**not designed**; built like the customer's) | `/reset-password?token=` | `POST auth/reset-password` |
| 1 Signup | `/register` | `POST auth/register` |
| 2 Pending, 2b Rejected, 2c Approved (one route, three states by `status`) | `/application` | `GET application`, `POST application/acknowledge` |
| Update and resubmit (the rejected screen's button; the signup form pre-filled) | `/application/resubmit` | `GET application/details`, `PUT application` |
| 3 Dashboard, 3b empty state | `/` | `GET dashboard/overview`, `GET dashboard/orders-requiring-dispatch` |
| 4 Orders, 4b empty state | `/orders` | `GET orders` |
| 5 Order fulfilment, 9 dispatch button states (behaviour only) | `/orders/:orderNumber` | `GET orders/:n`, `POST orders/:n/dispatch`, `GET orders/:n/invoice` |
| 5b Cancel order (pop-up) | `/orders/:orderNumber/cancel` | `POST orders/:n/cancel` |
| 6 Catalogue, 6b empty state | `/catalogue` | `GET catalogue`, `POST catalogue/:id/retire` |
| Retire (pop-up, **not designed**: irreversible) | `/catalogue/retire/:productId` | `POST catalogue/:id/retire` |
| 7 Add and edit product | `/catalogue/new`, `/catalogue/:productId` | `GET catalogue/categories`, `GET catalogue/:id`, `POST catalogue`, `PATCH catalogue/:id` |
| 8 Business profile | `/profile` | `GET auth/profile`, `PATCH auth/profile`, `POST auth/change-password`, `POST auth/logout` |
| Sign out, session expired (pop-ups) | `/profile/sign-out`, `/session-expired` | |
| 403, 500, not found | `/403` `/500` `*` | |

**Who sees what.** After sign-in `GET application` decides the landing page: `pending_review` and `rejected` go to `/application`; `approved` and
not acknowledged also go to `/application` (the "you're approved" notice, shown once); approved and acknowledged go to the dashboard. Everything
except `/application`, `/application/resubmit` and `change-password` is **approved sellers only** (the API answers 403 otherwise), so a guard
(`ApprovedRoute`) sits in front of the sidebar layout.

## 3. Decisions already made (carried from the customer app)

Same stack and rules, no new libraries: React 19, Vite, TypeScript, Ant Design 6, styled-components reading AntD tokens, Redux Toolkit with RTK Query,
Vitest and Testing Library, latest versions.

- **Structure.** `src/{router,auth,components,pages,store,infra,hooks,utils,styles,types,constants,patterns,test}`; `src/...` imports; shared parts prefixed `SA`; code used by one page lives in that page's `components/`; one `SATable`; no enums (`as const`); styling at the bottom of the file, no inline styles.
- **State.** One `api` slice; each feature injects its endpoints in `store/<feature>/{actions,slice,selector,types}.ts` (CM shape); a page-only store sits in `pages/<Page>/store`. A mutation lists the tags it changes. Cart-style "answer replaces the cache" only where the response is the whole object (profile, product).
- **Errors.** Backend shape `{ data, error, message }` becomes one `ApiError`; a refused change shows the backend's message; a 401 ends the session (`/session-expired`); no refresh token (ADR 0045).
- **Pop-ups are routes** (child routes, drawn with `SADialog`; pages that edit saved data ask before they are left, `UnsavedChangesDialog`), breadcrumbs from `handle.crumbs`, titles brand-first (`Sample Assist Seller Portal · Orders`), one `h1` per page, skip link, announcer, progress bar between routes, `SASkeleton` while loading, spinners via `usePending`, scroll to top on page change.
- **No sample data and no fake backend.** The customer app built every screen from JSON first, then deleted about 4,000 lines of it. Here **each slice is built against the real API from the start** (vertical slices), using the seeded sellers (section 7).

## 4. Where the designs and the backend disagree (the backend wins)

| # | Design | What we build | Why |
|---|---|---|---|
| 1 | Login: "Keep me signed in" | Left out | No refresh tokens yet (ADR 0045); tokens last 15 minutes |
| 2 | Login: an "or" divider with nothing under it | Left out | Nothing to offer |
| 3 | Signup: "Product categories" and "Role / title" | Left out | The API rejects both as unknown fields (no column); the profile derives categories from the seller's products |
| 4 | Signup: Confirm password | Checked in the form, **never sent** | The API rejects `confirmPassword` |
| 5 | Signup: password hint "at least 8 characters with one number" | The backend rule and its hint (the customer app's `PASSWORD_HINT`) | The design is weaker than what the API accepts |
| 6 | Signup: Business type select | Free text with suggestions (`AutoComplete`): Manufacturer, Wholesaler, Distributor, Retailer, Private company | API takes any text up to 100 characters; the seeded values are free text |
| 7 | Signup: ABN | Digits only, shown spaced (`51 824 753 556`), checksum validated on the form | Same algorithm as the API; "format and checksum on the form" is in scope |
| 8 | Signup: Contact name | Must be a full name (two words) | The API splits it on the last space |
| 9 | Status screens say "An **Innosano** administrator" | "A Sample Assist administrator" | Wrong brand name in the design |
| 10 | Pending: "typically reviews within 2 business days" | "A Sample Assist administrator will review your application before your listings go live." No number | The API has no review-time figure |
| 11 | Rejected: Contact support | `mailto:` the API's `supportContact.email`; the phone line only when it is not `null` | Contact details are server configuration |
| 12 | Breadcrumb "Device Management ›" on every page | Dropped. Crumbs are `Orders`, `Orders › ORD-2026-00126`, `Catalogue › Edit product` | A leftover from the Collection Manager file name; not a real level |
| 13 | Dashboard cards say "items" and "+3 today" | "orders", "products"; the third card's note is `listingsNeedingAttention` ("4 need attention") | The API counts orders, not items |
| 14 | Dashboard SLA badges (36h amber, 20h red) | Red when overdue or 24 hours or less, amber up to 48, plain after. Overdue reads "Overdue by 12h" | The API returns `slaHoursLeft` only, negative when overdue; the frontend picks the colour |
| 15 | Orders: status chips All, New, Picking, Dispatched, Delivered | All, New, Dispatched, Delivered, **Cancelled** | "Picking" is a screen step, not a stored status, so that filter returns nothing (ADR 0036); cancelled orders need a chip |
| 16 | Orders: View details and Download invoice always on | Download is disabled with a tip ("Available once dispatched") until `canDownloadInvoice` | The API answers 409 before dispatch |
| 17 | Fulfilment: Dispatch date and Est. delivery date inputs | Removed. After dispatch the estimated delivery is shown read-only | The server sets both; sending them is a 400 |
| 18 | Fulfilment: "Mark all picked" and the pick checkboxes | Kept, but **screen-only** (not stored, so a refresh resets them) | The backend has no picking status |
| 19 | Fulfilment: carrier field | Pre-filled from `dispatch.defaultCarrier` | Comes with the order detail |
| 20 | Cancel: "The customer will be refunded in full" | "The payment is marked refunded, the stock goes back to your listing, and the buyer is emailed" | No money moves in Phase 1 |
| 21 | Cancel: notes (optional) | Required when the reason is "Other", at most 500 characters | API rule |
| 22 | Catalogue: Retire is a link with a success banner afterwards | A confirmation pop-up first, then the banner | Retire cannot be undone and keeps the SKU reserved |
| 23 | Catalogue: inline price and stock cells | Left out: the list shows both as plain text, and they change only on the edit page (decision, 25 Oct 2026) | The backend's one-field `PATCH` is still there but unused; an accidental click-and-blur would have gone live on the buyer shop with no confirmation |
| 24 | Catalogue: low-stock banner names one product | One product named, or "N products are running low" with the names | `lowStock` is a list, shown on every tab |
| 25 | Retired row: "View / Read-only" | View opens the edit screen with every field disabled | A retired product is read-only (409 on edit) |
| 26 | Edit product: one "Brand / manufacturer" field | Two fields, Brand and Manufacturer | The API has `brand` and `manufacturer` separately |
| 27 | Edit product: category and sub-category | Both from `GET catalogue/categories`; the API gets the sub-category id if chosen, else the category id | API rule |
| 28 | Edit product: images | Up to 4, 5 MB, JPEG, PNG or WebP; the first is the main image; remove by id; no reordering | API rules; seeded products' image files do not exist, so those show the placeholder icon |
| 29 | Edit product: Save draft and Publish | Publish needs a description; Save draft on a published product unpublishes it (a message says so) | API rule |
| 30 | Profile: Current password input | Shown as dots (`passwordLength`), read-only; only the new password and its confirmation are typed | ADR 0030 and 0037; the API rejects `currentPassword` |
| 31 | Profile: Role / title, Product categories as inputs | Role left out; categories shown read-only as tags | No column; derived from products |
| 32 | Profile: Business name, ABN, sign-in email | Read-only | An admin verified the first two; the email is the identity (the API answers 400 if sent) |
| 33 | Profile: "Approved 01 Jan 2026 by Sample Assist administration" | Date from `verification.approvedAt` | |
| 34 | Orange `#FA8C16` with white text | See section 5 | Fails WCAG AA (2.4:1) |

## 5. Colour and accessibility — decided: option A

The brand orange `#FA8C16` gives **2.4:1** with white text and as link text on white, below the 4.5:1 AA minimum. The customer app handled the same
problem by darkening its blue. Options, with measured contrast:

| Option | Buttons | Links and active menu text | Result |
|---|---|---|---|
| **A (chosen)** | Keep `#FA8C16`, text `#1F1F1F` (6.9:1) | `#AD4E00` (5.4:1) | Looks like the design; passes AA |
| B | `#AD4E00` with white text (5.4:1) | `#AD4E00` | Passes, but a brown that no longer matches the design |
| C | Keep as designed | Keep as designed | Fails AA; not acceptable under the project rules |

Implemented as AntD tokens in one file (`colorPrimary`, `colorLink`, `Button.primaryColor`, `Menu.itemSelectedColor`), as in the customer app.

## 6. Architecture

### 6.1 Shared code — decided: copy

The customer app has about 35 files that are not about buyers. The seller portal **copies** them in step 1 and nothing is extracted into a shared
package (the alternative, a workspace package, was weighed and not chosen: it would have meant refactoring the finished customer app first).

Rules so the copies stay healthy:
- Copy from the customer app **as it is now**, keeping file names, props and exports identical, so extracting a package later is mechanical.
- Copy only what the seller portal uses. Leave out everything buyer-specific (`ProductCard`, `OrderSummaryCard`, `SAQuantityStepper`, `SAStockTag`, `SAProductImage`, checkout and card utils, `MainLayout`, `Header`).
- Each copied file keeps its tests, copied with it.
- A fix to a copied file (like the scroll-to-top on paging or the add-to-cart spinner) goes into **both** apps; the pull request checklist asks.

Copied in step 1:

| From the customer app | Notes |
|---|---|
| `infra/{http,api,errors,pagination}` | `api.ts`: new tag names; `http.ts`: reads `VITE_API_URL` |
| `hooks/{useDocumentTitle,usePending,useRouteModal}` | |
| `utils/{format,formRules,requiredMark,download}`, `patterns` | `formRules` gains the ABN and full-name rules |
| `components/{SABreadcrumb,SAChipGroup,SAEmpty,SAErrorPage,SAFormItem,SALoadError,SAPagination,SADialog,SASkeleton,SASkipLink,SASplashScreen,SATable,SATitle,SAToneTag}` | |
| `router/{RootLayout,PageMetaProvider,RouteErrorBoundary,handle,lazyPage,pageMeta,routeTitle}` | `routes.tsx` and `paths.ts` are written fresh |
| `styles/{ThemeBridge,globalStyles,styled.d}` | `theme.ts` is the seller palette |
| `store/{hooks,rootReducer,index}` and the auth store shape (`storage`, `listeners`, `selector`, `slice`) | Own session key; the user type carries the supplier status |
| `auth/{PrivateRoute,PublicRoute}` | `ApprovedRoute` is new |
| `setupTests.ts`, `test/{TestProviders,renderWithRouter,renderWithTheme}`, `.nvmrc`, `eslint.config.js`, tsconfigs, `package.json` scripts | |

### 6.2 Folder layout

```
Frontend/seller-portal/
├── src/
│   ├── router/        routes.tsx, paths.ts, RootLayout (progress bar, title, announcer)   [most files copied, see 6.1]
│   ├── auth/          PrivateRoute, PublicRoute, ApprovedRoute (status gate)
│   ├── components/    seller-only: SASidebar, SAPageHeader, SAStatusTag (order and listing), SAOrderSteps, SALogo
│   │   └── layouts/   SidebarLayout (approved sellers), AuthLayout (top bar, for sign-in and the status screens)
│   ├── pages/         Login, Register, ForgotPassword, ResetPassword, Application, Dashboard, Orders, OrderFulfilment,
│   │   └── Modals/    CancelOrderModal, RetireProductModal, SignOutConfirmModal, SessionExpiredModal
│   │                  Catalogue, ProductForm, BusinessProfile
│   ├── store/         auth, application, dashboard, orders, catalogue, profile  (actions, slice, selector, types)
│   ├── styles/        theme.ts (the orange tokens)
│   └── test/          render helpers only
└── docs/              ui-build-plan.md (this plan, moved), state-and-api.md
```

### 6.3 Layouts

- **SidebarLayout**: AntD `Layout.Sider`, 240 px, no top bar. Header: the business name in capitals (`overview.businessName`). Items: Dashboard, Orders, Catalogue (badge = `listingsNeedingAttention`, hidden at 0), Business profile. Selected item: tinted background and a left bar. Below the `lg` breakpoint (992 px) the Sider is replaced by a slim bar with a menu button, and the same navigation (`SideNav`) opens in a drawer. Content: page header (breadcrumb, title, right-aligned actions), then the page.
- **AuthLayout**: top bar with the logo and a link to the other form; used by login, register, forgot, reset and the status screens.
- The sidebar's name and badge read `dashboard/overview`, so that query is **tagged `Overview`** and invalidated by dispatch, cancel, retire, publish and product edits.

### 6.4 Stores and tags

| Store | Endpoints | Tags provided → invalidated by |
|---|---|---|
| `auth` | login, register, forgot, reset, logout, change-password | session in `sessionStorage` (own key); sign-out and expiry clear every cache (the listener from the customer app) |
| `application` | status, acknowledge, details, resubmit | `Application` |
| `dashboard` | overview, orders-requiring-dispatch | `Overview`, `Order` |
| `orders` | list, detail, dispatch, cancel, invoice (blob) | `Order` → dispatch and cancel invalidate `Order` and `Overview` |
| `catalogue` | list, categories, product, create, update, retire | `Product` → every write invalidates `Product` and `Overview` |
| `profile` | get, patch, change-password | the answer replaces the cached profile; a new token replaces the session after a password change |

Derived values (SLA badge tone, order step, dirty-field diffs for the profile and product forms) are plain functions in `selector.ts` or `utils`, each unit-tested.

## 7. Build steps

Each step is one pull request: UI and API together, lint, typecheck and build clean, unit tests for its logic, a browser walkthrough against the seeded
database, and the README and `docs/state-and-api.md` updated in the same change.

Seeded sellers (password `Password123!`): `priya@bindimedsupply.com.au` (approved, has orders and products), `r.patel@clinicalsupplies.com.au` (pending),
`d.liu@cheaptestkits.com.au` (rejected). For the empty states, register a new seller and approve it in the admin API (or add a fourth seeded seller, step 0).

| Step | What | Size | Done when |
|---|---|---|---|
| 0 | **Backend prerequisites.** `supplier-api` exposes `Content-Disposition` over CORS (invoice file names); optional: one seeded approved seller with no products or orders; optional: seller emails (approved, rejected, order cancelled) on the branded email layout | S | The invoice downloads with its file name from `localhost:5174` |
| 1 | **Scaffold** `seller-portal`: Vite, tsconfig, eslint, `.nvmrc`, `.env.example` (`VITE_API_URL`, `VITE_SUPPORT_EMAIL`), the copied files (6.1), theme, routes with placeholder pages, both layouts, sidebar, favicon (orange check), titles | M | `pnpm dev` shows the layouts and every route; README explains setup |
| 2 | **Auth**: login, forgot, reset, register, session, route guards, session-expired and sign-out pop-ups | L | Each seeded seller signs in; the wrong role gets 403; expiry returns to sign-in |
| 3 | **Application status**: pending, rejected, approved; resubmit; the status gate | M | Pending and rejected sellers land on their screen; resubmit goes back to pending; approved shows the notice once |
| 4 | **Dashboard and sidebar data**: cards, orders requiring dispatch, SLA badges, empty state, catalogue badge | M | Numbers match the database; empty seller sees the welcome banner |
| 5 | **Orders**: list (search, status chips, sort, paging, empty state), fulfilment screen, pick list, dispatch, cancel pop-up, invoice download | L | A new order is dispatched, then its invoice downloads; another is cancelled, stock and the buyer's view update |
| 6 | **Catalogue list**: filters, search, sort, paging, read-only price and stock, low-stock banner, retire pop-up, empty state | M | Edits persist and show on the buyer shop; retired products read-only |
| 7 | **Add and edit product**: form, categories, images (up to 4), save draft, publish, SKU clash, retired read-only | L | A published product appears on the customer shop; images show there |
| 8 | **Business profile**: read-only business block, editable contact and fulfilment settings, change password, sign out | M | A new SLA changes the dashboard's countdowns at once |
| 9 | **Polish**: accessibility pass (axe in the browser, focus, titles, skip link, announcer), loading, empty and error states on every page, scroll and spinners, docs, report update, pull-request split | M | Every route checked in the browser; axe clean; walkthrough and limitations in [browser-checklist.md](browser-checklist.md) |

**Order matters:** steps 2 and 3 gate everything else; 4 comes before 5 because the sidebar and the dispatch hand-off depend on `overview`; 6 before 7 because
the list is where the form is reached from.

## 8. Decisions (settled)

1. **Shared code:** copy the files (6.1); no shared package.
2. **Orange:** option A (section 5).
3. **Small design gaps:** the defaults in the table: business type as free text with suggestions, no review-time number, SLA badge red at 24 hours or less and amber up to 48, Brand and Manufacturer as two fields.
4. **Folder name:** `Frontend/seller-portal`.
5. **Pop-ups and unsaved changes (25 Oct 2026):** every pop-up uses one layout (`SADialog`), and leaving the product form or the business profile with edits asks "Save your changes?" (keep editing, discard, or save and go).

## 9. Testing and definition of done

No fake backend and no sample data (removed from the customer app on purpose). So:

- **Unit tests** for pure logic: the profile and product dirty-field diffs, ABN and full-name rules, SLA tone, order step, query builders, the status gate's decision, plus the copied components' own tests.
- **Component tests** for forms and small components that do not call the API (pick list and dispatch enabling, cancel reasons).
- **Browser walkthrough per step** against the seeded API, written as a short checklist in `docs/` and run before each pull request.
- **Later (Phase 2):** a small end-to-end suite against the seeded API, which would also cover the pages and the stores.
- Done also means (`CLAUDE.md`): lint and type checks with no new errors, a clean checkout runs from the README, self-reviewed pull request, and anything non-obvious documented. Backend changes (step 0) come with e2e tests.

## 10. Risks

- **Duplicated code.** About 35 files now exist twice (and again for admin). Mitigated by identical names and exports, copied tests, and a checklist line in every pull request; a shared package stays possible later.
- **Pick list is screen-only.** A refresh forgets it. Acceptable for Phase 1 and written in the UI copy; storing it would need a backend status.
- **15-minute tokens.** A seller filling the long product form can be signed out. Not mitigated: a saved draft would have to be reconciled with a product changed elsewhere, and images cannot be kept. Listed in `browser-checklist.md`.
- **Narrow screens.** Fixed in step 9: below 992 px the sidebar is a bar with a menu button and a drawer. The pages themselves stay desktop-only (responsive layouts are Phase 2).
- **Seeded image files do not exist.** Seeded products show the placeholder icon; products created in the portal are fine.
- **Backend gaps seen in the designs:** no "delivered" action, no `storageConditions` or `shelfLifeMonths` on the seller's product (the buyer's product page shows them blank), no reorder or choose-primary for images. None blocks Phase 1.
