# SA Marketplace — Frontend

Three React apps over the one shared backend (`../Backend`). Each is its own project with its own README, `package.json` and lockfile; there is
no workspace at this level. The fourth surface, the Collection Manager store, is not built yet.

| App | Folder | Port | API it talks to | For | Colour |
|---|---|---|---|---|---|
| Customer marketplace | `customer-facing-frontend` | 5173 | `customer-facing` (8001) | Buyers | blue `#0958d9` |
| Seller portal | `seller-portal` | 5174 | `supplier-api` (8002) | Verified suppliers | orange `#fa8c16` |
| SA Admin | `admin-portal` | 5175 | `admin-api` (8003) | Sample Assist staff | purple `#722ed1` |

The ports are fixed (`strictPort`): the reset-password links the backend emails point at them (`CUSTOMER_RESET_URL`, `SUPPLIER_RESET_URL`,
`ADMIN_RESET_URL` in `Backend/.env`).

Stack, in all three: React 19, Vite, TypeScript, Ant Design 6 (the only UI library), styled-components, Redux Toolkit with RTK Query, React Router,
Vitest and Testing Library.

## Run it from a clean checkout

**You need:** Node 24 or newer (`nvm use` reads each app's `.nvmrc`), pnpm (`corepack enable` installs the pinned version), and the backend running
(it needs Docker Desktop). The tests' jsdom does not run on Node 22 or older.

**1. Start the backend** (full detail in [../Backend/README.md](../Backend/README.md)):

```bash
cd SA_MarketPlace/Backend
cp .env.example .env
pnpm install
pnpm db:up && pnpm --filter @sa-marketplace/entities migration:run && pnpm db:seed
pnpm dev          # all three APIs in one terminal; or one `pnpm customer-facing` / `supplier-api` / `admin-api` per terminal, never both
```

**2. Start a front end** (one terminal each; run the ones you want to see):

```bash
cd SA_MarketPlace/Frontend/customer-facing-frontend   # or seller-portal, or admin-portal
pnpm install
pnpm dev
```

Open the address in the table. No `.env` is needed: the default API addresses are the local backend. Copy an app's `.env.example` to `.env` only to
point it somewhere else (`VITE_API_URL`; the seller portal also has `VITE_SUPPORT_EMAIL`).

## Sign in

Every seeded account has the password **`Password123!`** (fake data, local only). `pnpm db:seed` in `Backend/` puts the data back after you have changed it.

| App | Email | Notes |
|---|---|---|
| Customer | `j.shaw@saclinics.com.au` | Buyer and collection manager (two roles, one account) |
| Customer | `s.chen@miningco.com.au`, `t.beckett@worksafe.com.au` | Buyers with order history |
| Seller | `priya@bindimedsupply.com.au`, `m.webb@safetyfirstdist.com.au` | Approved sellers (Bindi MedSupply, SafetyFirst Distribution) |
| Seller | `r.patel@clinicalsupplies.com.au` / `d.liu@cheaptestkits.com.au` | Pending / rejected, to see the status screens (r.patel is the one waiting in SA Admin's queue) |
| Admin | `a.morgan@sampleassist.com.au` | Admin. Creating another admin needs a `@sampleassist.com.au` address |

Test cards at checkout: `4242 4242 4242 4242` is approved, `4000 0000 0000 0002` is declined; any future expiry and any 3-digit CVC. Payment is mocked.

To watch a whole cycle: register a seller in the seller portal, approve it in SA Admin, then sign in to the seller portal again.

## Commands (in each app's folder)

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server with hot reload |
| `pnpm test` | Vitest + Testing Library (`pnpm test:watch` to watch) |
| `pnpm typecheck` | `tsc -b` |
| `pnpm lint` | ESLint |
| `pnpm build` | Type check, then a production build into `dist/` (`pnpm preview` serves it) |

Before a pull request, run `pnpm typecheck && pnpm lint && pnpm test && pnpm build` in each app you touched.

## Where things are

| Looking for | Go to |
|---|---|
| How an app is laid out and its conventions | that app's `README.md` |
| Every screen, route and endpoint, and each place the backend won over the designs | `docs/ui-build-plan.md` in each app |
| The browser walkthrough, accessibility pass and known limitations | `docs/browser-checklist.md` (seller portal, SA Admin) |
| How the store and API client work, and the recipe for a new feature | `customer-facing-frontend/docs/state-and-api.md` |
| What was delivered, how it was verified and what comes next | [docs/report](docs/report) (hand-over report, PDF and source) |
| API operations and their curl examples | `../Backend/docs/api-reference.md`, and Swagger at `/docs` on each API |
| Why the backend works as it does | `../Backend/docs/adr` |

## Rules that apply to all three

- **Open the app's own folder in VS Code**, not the repository root: the root window pins the Backend's TypeScript 4.9, which cannot read these
  projects' config and reports false "cannot find module" errors.
- **About 35 generic files are copied between the apps** (table, pagination, dialog, layouts, hooks, the API client) and keep the same names and exports.
  A fix to one belongs in **all three**. Whether to extract a shared package before the CM store is an open decision (see the report).
- **The backend wins** where a design and the API disagree (GST is the total divided by 11, no supplier rating, the backend's password rule and
  statuses). Each app's plan lists the differences.
- **No sample data and no fake backend**: every screen reads the real API, so the backend must be running for anything to load.
- **Sessions last 15 minutes** and are not renewed (backend ADR 0045); an expired session shows "Session expired" and asks you to sign in again.
- **Never commit `.env`.** Only `.env.example` is tracked.
- Pop-ups are routes drawn with `SADialog`; pages that edit saved data ask before they are left (`useUnsavedChanges`); tests sit in `__tests__` folders
  beside the code; no enums (`as const` objects instead).

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `EADDRINUSE` or "Port 517x is already in use" | Another copy is running. Find it with `lsof -nP -iTCP:5173 -sTCP:LISTEN -t` and stop that process (ports 8001-8003 for the APIs) |
| The API terminal restarts in a loop | Two backend stacks are running (`pnpm dev` and the single commands). Run one only |
| Pages show an error and "Try again", or sign-in fails with a network error | The matching API is not running, or `VITE_API_URL` points elsewhere |
| "Session expired" | The 15-minute token ended. Sign in again |
| Sign-in is refused after several tries | Sign-in, sign-up and reset are limited to 5 a minute per IP. Wait a minute |
| Seeded data has changed or a seller is stuck in the wrong state | `pnpm db:seed` in `Backend/` |
| `pnpm install` warns about the Node version | Use Node 24 or newer (`nvm use`) |
| Product pictures show an icon | The seeded products point at image files that do not exist. Products created in the seller portal show real pictures |
| No reset email arrives | Email is opt-in (backend ADR 0046); with no Google settings the link is printed in the API terminal |
