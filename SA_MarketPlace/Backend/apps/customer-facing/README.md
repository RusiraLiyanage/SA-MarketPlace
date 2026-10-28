# customer-facing

The buyer-facing API for the SA Marketplace. Runs on port **8001** over the shared
database defined in `packages/entities`.

Setup and all commands live in the [Backend README](../../README.md).

| Command | What it does |
|---|---|
| `pnpm customer-facing` (from `Backend/`) | Build the shared packages, then run in watch mode |
| `pnpm --filter @sa-marketplace/customer-facing test:e2e` | End-to-end tests. Needs `pnpm db:up` |

Routes: `/health` · `/docs` (development only) · `/api/customer/v1/...`
