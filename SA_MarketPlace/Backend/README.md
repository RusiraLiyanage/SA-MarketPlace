# SA Marketplace — Backend

Three NestJS APIs over **one shared PostgreSQL database**, all running on your machine (no cloud).
Scope is in [CLAUDE.md](../../CLAUDE.md), the schema in [DATABASE.md](../../DATABASE.md).

| App | Port | For | Swagger (dev) |
|---|---|---|---|
| `customer-facing` | 8001 | Buyers | http://localhost:8001/docs |
| `supplier-api` | 8002 | Sellers | http://localhost:8002/docs |
| `admin-api` | 8003 | Sample Assist staff | http://localhost:8003/docs |

## Run it from a clean checkout

**You need:** Node 18+, [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running), and pnpm
(`corepack enable` installs the pinned version). Postgres runs in Docker, so install nothing else.

```bash
cd SA_MarketPlace/Backend
cp .env.example .env
pnpm install          # first run also downloads Chromium (~150 MB) for invoice PDFs
pnpm db:up && pnpm --filter @sa-marketplace/entities migration:run && pnpm db:seed
```

Start the APIs, one terminal each:

```bash
pnpm customer-facing
pnpm supplier-api
pnpm admin-api
```

Or run all three in one terminal with `pnpm dev`. Run **one or the other, never both**: two stacks share the same
`dist` folders and ports, so each rebuild restarts the other's APIs in a loop. File watching is set in
`packages/tsconfig/base.json` (`watchOptions`), because TypeScript's default recompiled, and restarted every API, on
any file change anywhere in the repository, even a README.

Open a Swagger page, `POST /api/<app>/v1/auth/login` with a login below, then paste the
`access_token` into **Authorize**. Tokens last 15 minutes by default.

Check it worked: `pnpm db:verify` (33 checks, all `PASS` on a freshly seeded database).
Manual testing changes the data and can fail a check; `pnpm db:seed` resets it.

### Seeded logins

Every seeded account uses the password **`Password123!`** (fake data, local only).

| App | Email | Notes |
|---|---|---|
| Customer | `j.shaw@saclinics.com.au` | Buyer and collection manager (two roles, one account) |
| Customer | `s.chen@miningco.com.au`, `t.beckett@worksafe.com.au` | Buyers with order history |
| Supplier | `priya@bindimedsupply.com.au` | Approved seller (Bindi MedSupply) |
| Supplier | `r.patel@clinicalsupplies.com.au` / `d.liu@cheaptestkits.com.au` | Pending / rejected sellers |
| Admin | `a.morgan@sampleassist.com.au` | Admin. New admin sign-ups need a `@sampleassist.com.au` address |

Test card for checkout: `4242 4242 4242 4242` is approved, `4000 0000 0000 0002` is declined.
Any future expiry and any 3-digit CVC. Payment is mocked and no card data is stored.

### Frontend

Three front ends use these APIs (Node 24+). Each runs on its own port, against its own API from the table above, and has its own README:

| App | Folder | Port | API it needs | Sign in with |
|---|---|---|---|---|
| Customer marketplace | `Frontend/customer-facing-frontend` | 5173 | `customer-facing` (8001) | a seeded buyer |
| Seller portal | `Frontend/seller-portal` | 5174 | `supplier-api` (8002) | a seeded seller |
| SA Admin | `Frontend/admin-portal` | 5175 | `admin-api` (8003) | the seeded admin |

```bash
cd ../Frontend/admin-portal    # or customer-facing-frontend, or seller-portal
pnpm install
pnpm dev
```

The ports are fixed because the reset-password links in the emails point at them (`CUSTOMER_RESET_URL`, `SUPPLIER_RESET_URL`, `ADMIN_RESET_URL`).

## Everyday commands

Run from `SA_MarketPlace/Backend`.

| Command | What it does |
|---|---|
| `pnpm db:up` / `db:down` | Start / stop Postgres (data is kept) |
| `pnpm db:reset` | Stop and **destroy** the data, then start clean |
| `pnpm db:seed` | Reload the development data (replaces the seeded tables) |
| `pnpm db:verify` | Schema and data checks |
| `pnpm build` · `typecheck` · `lint` | Build, type-check, lint everything |
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | End-to-end tests against the real database (needs `db:up` and a seed) |
| `pnpm --filter @sa-marketplace/entities migration:run` | Apply migrations (also `migration:revert`, `migration:generate src/migrations/Name`) |

Database shell: `docker compose exec postgres psql -U sa_user -d sa_marketplace`.
Host port is **5433**, not 5432, to avoid clashing with a local Postgres.

## Real email (optional)

Reset-password emails go through a Gmail account. You need a Google Cloud OAuth client (Gmail API on, the sending account added as a test
user) with its ID and secret in `.env`, then:

```bash
pnpm mail:token     # open the address it prints, sign in with the sending Gmail account, allow access
```

It saves `GOOGLE_REFRESH_TOKEN` and `MAIL_FROM_ADDRESS` to `.env`; restart the API. While the OAuth client is in *Testing* mode the token
expires after 7 days (run it again). Seeded accounts have fake addresses, so register one with an inbox you own to see the email arrive.

**Email design.** Every email uses one branded layout (`packages/common/src/modules/mail/templates/layout.ts`); an email only supplies its words and gets
an HTML and a plain-text version. To add one, copy `reset-password.email.ts`, export it from `packages/common/src/index.ts`, add it to
`scripts/mail-preview.mjs`, and call `mailService.send({ to, subject, ...yourEmail(data) })`. `pnpm mail:preview` writes each one to
`storage/mail-preview/` to open in a browser.

## Configuration

`.env.example` works as-is for local use. `.env` is git-ignored: never commit it. Replace
`JWT_SECRET` for anything shared (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

| Variable | Purpose |
|---|---|
| `DB_HOST` `DB_PORT` `DB_USERNAME` `DB_PASSWORD` `DB_NAME` | Database connection (read by Docker only when the volume is first created) |
| `DB_LOGGING` | `true` prints every SQL query |
| `JWT_SECRET` · `JWT_EXPIRES_IN` | Token signing key · token lifetime (default `15m`) |
| `AUTH_THROTTLE_LIMIT` · `AUTH_THROTTLE_TTL` | Login/sign-up rate limit per IP (5 per 60 s) |
| `CUSTOMER_RESET_URL` `SUPPLIER_RESET_URL` `ADMIN_RESET_URL` | Frontend page each reset link points to |
| `PASSWORD_RESET_TOKEN_TTL_MINUTES` | Reset link lifetime (30) |
| `GOOGLE_CLIENT_ID` `GOOGLE_CLIENT_SECRET` `GOOGLE_REFRESH_TOKEN` `MAIL_FROM_ADDRESS` | Optional. Real email through Gmail; with none set, emails are only logged ([0046](docs/adr/0046-real-email-through-gmail.md)). `MAIL_FROM_NAME` is the display name |
| `SUPPORT_EMAIL` · `SUPPORT_PHONE` | Contact details shown to sellers |
| `ADMIN_EMAIL_DOMAINS` | Optional. Domains allowed to register as admin (`sampleassist.com.au`) |
| `ORDER_EXPORT_MAX_ROWS` | Optional. Row cap for the admin orders CSV (10000) |

## Decisions

Every decision has a short record in [docs/adr](docs/adr/README.md): context, decision and cost.
The ones that shape how everything works:

- **One system, one database.** Three APIs share it. Nothing syncs.
- **Migrations only.** `synchronize` is off and the database is never edited by hand ([0001](docs/adr/0001-hand-written-migrations.md)).
- **One account, many roles.** Each app accepts only its own tokens ([0019](docs/adr/0019-per-app-audience-and-allowed-roles.md)); logging out or changing a password invalidates old tokens ([0018](docs/adr/0018-logout-via-token-version.md)).
- **The token decides whose data you see.** Endpoints never take a user id; services filter by it, and someone else's record looks like a 404 ([0025](docs/adr/0025-ownership-checks-return-404.md)).
- **Prices freeze at checkout; one order per supplier.** Checkout re-checks the cart and reserves stock before charging ([0023](docs/adr/0023-checkout-transaction-ordering.md)); money is a string, never a float ([0008](docs/adr/0008-numeric-as-string.md)).
- **Invoices are stored documents.** Generated once from the frozen order and re-served ([0036](docs/adr/0036-seller-orders.md)); the PDF browser restarts itself if it dies ([0043](docs/adr/0043-pdf-browser-recovers-itself.md)).
- **Payment is mocked and never stores card details** ([0024](docs/adr/0024-mock-payment-gateway.md)).
- **Email is opt-in.** With no Google settings, reset links are printed in the API terminal as `[mock email]`; with them, they are sent ([0029](docs/adr/0029-password-reset-tokens.md), [0046](docs/adr/0046-real-email-through-gmail.md)). See *Real email* below.
- **Admin sign-up is limited to staff email domains** ([0038](docs/adr/0038-admin-auth.md)).
- **Swagger fields are declared explicitly** where auto-detection misses them ([0044](docs/adr/0044-explicit-swagger-fields.md)).

**Not built yet (decided to defer):** Collection Manager ordering and SSO, adding stock to the
buyer's inventory on delivery, "keep me signed in" refresh tokens ([0045](docs/adr/0045-refresh-tokens-deferred.md); a frontend treats a 401 as signed out),
Redis, real payments.

Endpoint-by-endpoint notes with curl examples: [docs/api-reference.md](docs/api-reference.md).

## Layout

```
Backend/
├── docker-compose.yml   Postgres 16 on host port 5433
├── .env.example         the environment contract
├── docs/                decision records, API reference, DB verification
├── scripts/             verify-schema.sql
├── storage/             uploaded product images and invoice PDFs (created at runtime, git-ignored)
├── packages/
│   ├── entities/        entities, migrations, seed, database module
│   ├── common/          config, filters, mail, PDF and invoice services, helpers
│   ├── auth/            JWT strategies, guards, roles
│   └── tsconfig/ eslint-config/
└── apps/  customer-facing  supplier-api  admin-api
```

Packages are consumed as compiled `dist`; `pnpm customer-facing` (and the other two) build them first.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Cannot connect to the Docker daemon` | Start Docker Desktop and wait until it settles |
| `Missing required environment variable(s)` | You skipped `cp .env.example .env` |
| Port 5433 in use | Change `DB_PORT` in `.env`, then `pnpm db:reset` |
| Changed `DB_PASSWORD` and the login now fails | Docker reads it only on first start; run `pnpm db:reset` |
| `401` after about 15 minutes | The token expired; log in again |
| `429 Too Many Requests` on login | 5 attempts per minute per IP; wait a minute |
| Invoice PDF fails | Chromium missing: `npx puppeteer browsers install chrome`, then restart the API |
| Port 800x already in use | A copy of that API is still running: `lsof -nP -iTCP:8001 -sTCP:LISTEN` |
| Warnings about `resolutions` | pnpm was run outside `Backend/`; run it from here |
