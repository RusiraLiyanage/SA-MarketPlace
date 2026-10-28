# SA Admin: frontend

The staff app: supplier verification (approve or reject a seller) and read-only oversight of every order. React 19, Vite, TypeScript, Ant Design 6
(the only UI library), styled-components, Redux Toolkit with RTK Query. Talks to the admin API on port 8003. It is built like the seller portal
(`../seller-portal`) with its own purple.

**Status: complete (step 8 of 8, polish).** Sign in, create an account (Sample Assist staff addresses only), forgot and reset password, the session, the route guards, sign out, the supplier verification queue (search, status chips with counts, banner, sidebar badge) one application's review (details, a checklist that unlocks Approve, approve and reject), the all-orders list (search, payment and fulfilment filters, sorting, paging, Export CSV), an order's read-only detail with invoice download, and My profile (name, change password, sign out, unsaved-changes prompt) are built and connected; the final accessibility pass is done. The browser walkthrough and the known limitations are in [docs/browser-checklist.md](docs/browser-checklist.md). The plan, with every screen,
route, endpoint and each place the backend wins over the designs, is in [docs/ui-build-plan.md](docs/ui-build-plan.md).

Setup for all three front ends, with the seeded logins, is in [../README.md](../README.md). Needs Node 24 or newer (`nvm use` reads `.nvmrc`). **pnpm is the package manager** (pinned in `package.json`; `corepack enable` installs it).

```bash
pnpm install
pnpm dev          # http://localhost:5175 (the address the backend's ADMIN_RESET_URL expects); API at VITE_API_URL
pnpm test         # Vitest + Testing Library
pnpm typecheck && pnpm lint && pnpm build
```

Start the admin API first (`pnpm admin-api` in `Backend/`, or `pnpm dev` there for all three). Copy `.env.example` to `.env` only to change the API address.
The seeded admin (password `Password123!`): `a.morgan@sampleassist.com.au`. A new admin account needs a `@sampleassist.com.au` address.
On a pending application, Approve stays disabled until the three checks are ticked (the ticks are not saved); Reject is always available.

## Structure

```
src/
├── router/          routes.tsx (the whole route tree), paths.ts (every URL), lazyPage.ts, handle.ts (breadcrumbs, titles)
├── components/      shared parts: SATable, SAPagination, SAPageHeader, SADialog, SASkeleton, SALogo…
│   └── layouts/     SidebarLayout (signed-in admins: sidebar + page), AuthLayout (logo bar, for sign-in and the password pages)
├── pages/           one folder per screen, each with its own components/ folder
├── store/           Redux: shared features and the store setup; a page-only store sits in pages/<Page>/store
├── infra/           API client (http.ts, api.ts, errors.ts) and pagination.ts (the backend's paging contract)
├── hooks/ utils/ patterns/ constants/ styles/ (theme.ts is the Ant Design token set)
└── test/            render helpers
```

## Conventions

The same as the seller portal, which this was copied from (see its README and `docs/ui-build-plan.md`): `src/...` imports; `SA`-prefixed shared parts;
routes declared once in `router/routes.tsx` and navigated with `PATHS`; pop-ups are child routes drawn with `SADialog`; a page that edits saved data uses
`useUnsavedChanges` and `UnsavedChangesDialog` to ask before it is left; breadcrumbs and page names from `handle`; styled-components at the bottom of the
file reading Ant Design tokens; no enums; tests in a `__tests__` folder beside the code; no sample data and no fake backend, so to see the app you need the API
running with the seeded database (`Backend/README.md`).
