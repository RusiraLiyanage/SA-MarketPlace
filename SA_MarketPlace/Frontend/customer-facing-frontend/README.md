# Customer marketplace — frontend

React 19, Vite, TypeScript, Ant Design 6 (the only UI library) and styled-components. Talks to the customer API on port 8001.
The structure follows the Collection Manager app. **Status: every screen is built and connected to the customer API.** Shop, product detail, cart, checkout, order confirmation, auth, My orders, order detail and the profile. There is no sample data or fake backend: it all comes from the API.

Setup for all three front ends, with the seeded logins, is in [../README.md](../README.md). Open **this folder** in VS Code (not the repo root): the root window pins the Backend's TypeScript 4.9, which cannot read this project's
config and reports false "cannot find module" errors. Opened on its own, VS Code uses its bundled TypeScript 6, which matches.

Needs Node 24 or newer (`nvm use` reads `.nvmrc`); the tests' jsdom does not run on Node 22.12 and older, and `pnpm install` warns about it. Checked on
Node 25. pnpm is pinned in `package.json` (`corepack enable` installs it).

```bash
pnpm install
pnpm dev          # http://localhost:5173 (the address the backend's CUSTOMER_RESET_URL expects); API at VITE_API_URL
pnpm test          # Vitest + Testing Library
pnpm typecheck && pnpm lint && pnpm build
```

Start the customer API first (`pnpm customer-facing` in `Backend/`, or `pnpm dev` there for all three). Copy `.env.example` to `.env` only to change the API address.
Seeded buyers (password `Password123!`): `j.shaw@saclinics.com.au` (buyer and collection manager), `s.chen@miningco.com.au`, `t.beckett@worksafe.com.au`.
Checkout test cards: `4242 4242 4242 4242` is approved, `4000 0000 0000 0002` is declined (any future expiry, any 3-digit CVC).

## Structure

```
src/
├── router/          routes.tsx (the whole route tree), paths.ts (every URL), lazyPage.ts, handle.ts (breadcrumbs)
├── auth/            PrivateRoute (needs a session), PublicRoute (sign-in pages; sends a signed-in buyer on)
├── components/      shared parts: SATable, SAPagination, SABreadcrumb, SARouteModal, ProductCard, OrderSummaryCard…
│   └── layouts/     MainLayout, AuthLayout, PageLayout, Header/ (logo, nav, cart, profile menu)
├── pages/           one folder per screen, each with its own components/ folder
│   └── Modals/      pop-ups, each with its own route
├── types/           shapes that mirror the backend responses
├── infra/           API client (http.ts, api.ts, errors.ts) and pagination.ts (the backend's paging contract)
├── store/           Redux: shared features (auth, cart, products…) and the store setup; a page-only store sits in pages/<Page>/store (see docs/state-and-api.md)
├── constants/ hooks/ styles/ (theme.ts is the Ant Design token set)
```

## Conventions

- **Imports** use `src/...` (as in Collection Manager).
- **Shared building blocks** are prefixed `SA` (`SATable`, `SAPagination`…). Anything used on one page lives in that
  page's `components/` folder; anything used on two or more moves to `src/components`.
- **One table component.** Every table is `SATable` (Ant Design `Table` with paging and sorting wired to `PagingMeta`).
- **Routes** are declared once in `router/routes.tsx` and loaded lazily. Navigate with `PATHS`, never string literals.
- **Pop-ups are routes.** A modal is a child route of the page it opens over (`/cart/remove/:productId`) and is drawn with
  `SADialog`: a coloured icon, a title with a one-line summary, "What changes" and "What stays the same" lists, an optional note and
  equal buttons with the safe choice first. The page stays rendered behind it and closing goes back to the page.
- **Unsaved changes.** A page that edits saved data (My profile) calls `useUnsavedChanges(dirty)` and renders `UnsavedChangesDialog`:
  leaving with edits asks to keep editing, discard or save first; closing the tab gets the browser's own warning.
- **Breadcrumbs** come from a route's `handle.crumbs`; a page without one shows none.
- **Data** comes from the API through RTK Query (`docs/state-and-api.md`); there is no sample data in the project. To see the app you need the API
  running with the seeded database (`Backend/README.md`).
- **Styling** is styled-components at the bottom of the component file, reading Ant Design tokens through `theme`
  (`${({ theme }) => theme.colorPrimary}`); avoid inline styles. Prices and dates go through `utils/format.ts`.
- **Accessibility.** One `h1` per page (`SAPageTitle`) and `h2` for cards (`SASectionTitle`); a route's name comes from `handle.title` or its last
  breadcrumb. Text on a tinted background uses the theme's `...Text` colours (`colorSuccessText`…), not the brand fills.
- **Tests live in a `__tests__` folder** next to the code they cover (`ProductCard/__tests__/ProductCard.test.tsx`), never among the source files.
  Shared test helpers (`renderWithTheme`, `renderWithRouter`, `TestProviders`) are in `src/test`. Tests cover helpers, forms and components; there is no
  fake API, so a page that calls the API is checked in the browser against the real one.
- No enums (`erasableSyntaxOnly`): use `as const` objects, as in `types/`.

## Routes

| URL | Page |
|---|---|
| `/login` `/register` `/forgot-password` `/reset-password` | Auth pages (`AuthLayout`) |
| `/session-expired` | Session expired pop-up |
| `/shop` | Catalogue |
| `/shop/products/:productId` | Product detail |
| `/cart` | Cart; `/cart/remove/:productId` and `/cart/clear` (pop-ups) |
| `/checkout/delivery` `/checkout/payment` | Checkout steps; `/checkout/payment/declined` (pop-up) |
| `/checkout/confirmation/:orderNumber` | Order confirmation |
| `/orders` | My orders; `/orders/reorder/:orderNumber` (pop-up) |
| `/orders/:orderNumber` | Order detail; `/orders/:orderNumber/reorder` (pop-up) |
| `/profile` | My profile; `/profile/sign-out` (pop-up) |
| `/403` `/500` `*` | Error pages |

## Next

Every screen is connected to the API; the recipe for adding a feature is in [docs/state-and-api.md](docs/state-and-api.md). The seller portal
(`../seller-portal`) and SA Admin (`../admin-portal`) were built from this app. The Collection Manager store is next. The API address is
`VITE_API_URL` (`.env.example` has the default).

## Versions

Everything uses the latest release (`pnpm outdated` should print nothing). TypeScript 7 compiles (`tsc`), while the
`typescript` package is aliased to `@typescript/typescript6` so `typescript-eslint` can use the 6.0 API until it
supports 7. See the TypeScript 7 release notes, "running side by side".

Where a design and the backend disagree, the backend's decision wins: GST is the total divided by 11, there is no
supplier rating, and counts come from `pagingMeta`.
