# Seller portal — frontend

The supplier-facing app: sign in, application status, dashboard, orders, catalogue and business profile. React 19, Vite, TypeScript, Ant Design 6
(the only UI library), styled-components, Redux Toolkit with RTK Query. Talks to the supplier API on port 8002. It is built like the customer
marketplace (`../customer-facing-frontend`), with a sidebar instead of a top bar and the seller's orange.
**Status: complete (step 9 of 9, polish).** Sign in, register, forgot and reset password, the session, route guards, the application screens (under review, not approved with resubmit, approved), the status gate, the dashboard with the sidebar's live business name and Catalogue badge, the orders (list, fulfilment with pick list and dispatch, cancel, invoice download) the catalogue list (search, status chips, sorting, low-stock banner, retire; price and stock are shown read-only and changed on the edit page) and the add/edit product form (categories, up to four images, save draft, publish, read-only retired view), and the business profile (editable contact and fulfilment settings, change password, sign out) are built and connected. After sign-in `GET /application` decides where a seller belongs: the portal, or the screen that says where their application stands. The plan and the
screen-by-screen list are in [docs/ui-build-plan.md](docs/ui-build-plan.md); the browser walkthrough, the accessibility pass and the known limitations are in [docs/browser-checklist.md](docs/browser-checklist.md).

Setup for all three front ends, with the seeded logins, is in [../README.md](../README.md). Needs Node 24 or newer (`nvm use` reads `.nvmrc`). **pnpm is the package manager** (pinned in `package.json`; `corepack enable` installs it).

```bash
pnpm install
pnpm dev          # http://localhost:5174 (the address the backend's SUPPLIER_RESET_URL expects); API at VITE_API_URL
pnpm test         # Vitest + Testing Library
pnpm typecheck && pnpm lint && pnpm build
```

Start the supplier API first (`pnpm supplier-api` in `Backend/`). Copy `.env.example` to `.env` only to change the API address.
Seeded sellers (password `Password123!`): `priya@bindimedsupply.com.au` approved, `r.patel@clinicalsupplies.com.au` pending,
`d.liu@cheaptestkits.com.au` rejected.

## Structure

```
src/
├── router/          routes.tsx (the whole route tree), paths.ts (every URL), lazyPage.ts, handle.ts (breadcrumbs, titles)
├── components/      shared parts: SATable, SAPagination, SAPageHeader, SADialog, SASkeleton, SALogo…
│   └── layouts/     SidebarLayout (approved sellers: sidebar + page), AuthLayout (logo bar, for sign-in and status screens)
├── pages/           one folder per screen, each with its own components/ folder
├── store/           Redux: shared features and the store setup; a page-only store sits in pages/<Page>/store
├── infra/           API client (http.ts, api.ts, errors.ts) and pagination.ts (the backend's paging contract)
├── hooks/ utils/ patterns/ constants/ styles/ (theme.ts is the Ant Design token set)
└── test/            render helpers
```

## Conventions

The same as the customer app, which this was copied from (see its README and `docs/state-and-api.md`): `src/...` imports; `SA`-prefixed shared parts;
routes declared once in `router/routes.tsx` and navigated with `PATHS`; pop-ups are child routes drawn with `SADialog` (icon, summary, what changes / what stays the same, equal buttons); a page that edits saved data (product form, business profile) uses `useUnsavedChanges` and `UnsavedChangesDialog` to ask before it is left; breadcrumbs and page names from
`handle`; styled-components at the bottom of the file reading Ant Design tokens; no enums; tests in a `__tests__` folder beside the code; no sample data
and no fake backend, so a page that calls the API is checked in the browser against the real one.

- **Copied code.** About 35 files come from the customer app and keep the same names and exports. A fix to one of them (scroll to top on paging, the
  add-to-cart style spinner via `usePending`) belongs in **both** apps.
- **Orange.** White on the brand orange `#fa8c16` is 2.4:1, under the AA minimum, so text on an orange fill is near-black and orange text (links, the
  active menu item) is the darker `#ad4e00`. See `styles/theme.ts`.
- **Where a design and the backend disagree, the backend wins**; the list is in the plan, section 4.
