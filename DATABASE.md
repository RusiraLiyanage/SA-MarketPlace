# SA Marketplace — Database Specification

Companion to `CLAUDE.md`. Read that first for project scope and architectural rules.
This document specifies the database layer: Docker setup, the `entities` package,
the full schema, migrations, and seed data.

---

## 1. Principles

1. **One database, one schema, shared by all apps.** Customer, seller and admin APIs read
   and write the same tables. Never create per-app databases or sync jobs.
2. **Migrations only.** `synchronize: false` always. Never hand-edit the database, never
   let TypeORM auto-sync — not even in development.
3. **Local only.** Postgres runs in a Docker container on the developer's machine.
   No cloud database, no managed service, no CI/CD yet.
4. **No Redis.** Caching is a Phase 3 bonus. Do not add a Redis container or module.
5. **Immutability where it matters.** Prices, invoices and order lines are historical
   records. Once written they are never recalculated from live data.
6. **No real data.** Seed data is fictional. No real customer, health, or card data ever.

---

## 2. Docker

Create `Backend/docker-compose.yml` with a single Postgres service.

Requirements:

| Setting | Value |
|---|---|
| Image | `postgres:16-alpine` (pin the major version) |
| Container name | `sa-marketplace-db` |
| Host port | `5433` mapped to container `5432` |
| Database | `sa_marketplace` |
| User / password | from env vars, defaulted for local dev |
| Volume | named volume for `/var/lib/postgresql/data` so data survives restarts |
| Healthcheck | `pg_isready`, so the API can wait for readiness |
| Restart policy | `unless-stopped` |

Port **5433** deliberately, not 5432 — the developer likely has another Postgres running
for the existing Sample Assist work, and a collision wastes an afternoon.

Add root `package.json` scripts:

```
db:up      -> docker compose up -d
db:down    -> docker compose down
db:reset   -> docker compose down -v && docker compose up -d
db:logs    -> docker compose logs -f postgres
```

`db:reset` destroys the volume. It should be used freely during development — the seed
must always be able to rebuild everything from empty.

---

## 3. Where the database layer lives

Everything below belongs in `Backend/packages/entities`:

```
packages/entities/
├── package.json
├── tsconfig.json
├── src/
│   ├── database/
│   │   ├── database.module.ts      NestJS module, TypeOrmModule.forRootAsync
│   │   ├── data-source.ts          standalone DataSource for the TypeORM CLI
│   │   └── naming.strategy.ts      snake_case naming strategy
│   ├── entities/
│   │   ├── identity/               organisation, user, user-role, supplier-profile
│   │   ├── catalogue/              category, product, product-image
│   │   ├── ordering/               cart, cart-item, order, order-item
│   │   ├── fulfilment/             delivery, carrier
│   │   ├── billing/                payment, invoice
│   │   └── inventory/              inventory
│   ├── enums/
│   ├── migrations/
│   ├── seeds/
│   └── index.ts                    barrel export
```

Two separate database entry points are required and this trips people up:

- **`database.module.ts`** — used by the running NestJS apps, reads config via Nest's
  `ConfigService`.
- **`data-source.ts`** — used by the TypeORM CLI to generate and run migrations. The CLI
  runs outside Nest, so it must read env directly (e.g. via `dotenv`).

They must point at the same database and use the same entity list and naming strategy.

---

## 4. Environment contract

`Backend/.env.example` (committed) and `Backend/.env` (gitignored):

```
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=sa_user
DB_PASSWORD=sa_local_password
DB_NAME=sa_marketplace
DB_LOGGING=true
NODE_ENV=development
JWT_SECRET=<32 random bytes, hex>
JWT_EXPIRES_IN=15m
```

Validate these at boot (in `packages/common` app config) and fail fast with a clear
message if any are missing. A silent connection failure is far harder to debug.

---

## 5. Schema conventions

Apply consistently to every table:

| Concern | Rule |
|---|---|
| Primary key | `uuid`, generated (`uuid_generate_v4()` / `gen_random_uuid()`) |
| Naming | `snake_case` tables and columns, singular table names |
| Timestamps | `created_at`, `updated_at` — `timestamptz`, not null, defaults |
| Money | `numeric(10,2)`. **Never float.** All prices GST-inclusive |
| Enums | Postgres native enum types, defined in `src/enums` |
| Deletion | Prefer status columns over deletes. Never hard-delete products or orders |
| FK indexes | Index every foreign key column |
| Nullability | Explicit on every column — decide, don't default |

---

## 6. Entities

### 6.1 `organisation`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | varchar(255) NOT NULL | |
| abn | varchar(11) NULL | |
| billing_address | text NULL | |
| created_at / updated_at | timestamptz | |

Buyers belong to an organisation. Orders and invoices are issued to it, and Phase 2
organisation-specific pricing will hang off it.

### 6.2 `user`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| organisation_id | uuid NULL FK → organisation | Null for sellers and admins |
| email | varchar(255) NOT NULL **UNIQUE** | Globally unique — one email, one account |
| password_hash | varchar(255) NOT NULL | bcrypt or argon2. Never plaintext |
| first_name | varchar(100) NOT NULL | |
| last_name | varchar(100) NOT NULL | |
| phone | varchar(32) NULL | |
| status | enum `user_status` NOT NULL default `active` | |
| token_version | integer NOT NULL default 0 | Bumped on logout; every older token stops working |
| terms_accepted_at | timestamptz NULL | When the user accepted the terms. Null for accounts created before sign-up asked |
| created_at / updated_at | timestamptz | |

### 6.3 `user_role`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid NOT NULL FK → user | |
| role | enum `user_role_type` NOT NULL | |

**UNIQUE (user_id, role).** One user may hold several roles — this is the table that
satisfies the brief's "a single account can hold more than one role".

### 6.4 `supplier_profile`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid NOT NULL **UNIQUE** FK → user | |
| business_name | varchar(255) NOT NULL | |
| abn | varchar(11) NOT NULL | |
| business_type | varchar(100) NULL | |
| status | enum `supplier_status` NOT NULL default `pending_review` | |
| approved_by_user_id | uuid NULL FK → user | The admin who decided |
| approved_at | timestamptz NULL | |
| rejection_reason | text NULL | Shown to the applicant on the Rejected screen |
| dispatch_sla_hours | int NOT NULL default 48 | |
| default_carrier | varchar(100) NULL | |
| created_at / updated_at | timestamptz | |

Products belong to **this profile**, not to the user — so Phase 3 multi-user seller
accounts won't require migrating every listing.

### 6.5 `admin_invite` (removed)

Dropped by the `DropAdminInvite` migration: admin sign-up is limited to allowed work-email
domains instead of invitations (ADR 0038). The number is kept so §6.6 and later do not move.

### 6.6 `category`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | varchar(120) NOT NULL | |
| slug | varchar(120) NOT NULL UNIQUE | |
| parent_id | uuid NULL FK → category | Self-reference gives sub-categories |
| created_at / updated_at | timestamptz | |

### 6.7 `product`

Specification fields are **merged into product** rather than kept in a separate 1:1 table,
to avoid the duplicated-column problem in the original ER draft.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| supplier_profile_id | uuid NOT NULL FK → supplier_profile | |
| category_id | uuid NOT NULL FK → category | |
| name | varchar(255) NOT NULL | |
| description | text NULL | |
| sku | varchar(64) NOT NULL | |
| price | numeric(10,2) NOT NULL | GST-inclusive |
| quantity | int NOT NULL default 0 | Supplier's sellable stock |
| low_stock_threshold | int NOT NULL default 0 | |
| listing_status | enum `listing_status` NOT NULL default `draft` | |
| brand | varchar(120) NULL | |
| manufacturer | varchar(120) NULL | |
| pack_size | varchar(60) NULL | |
| certification | varchar(255) NULL | |
| storage_conditions | varchar(255) NULL | |
| shelf_life_months | int NULL | |
| created_at / updated_at | timestamptz | |

**UNIQUE (supplier_profile_id, sku)** — SKUs are unique per supplier, not globally.

Stock status ("In Stock" / "Low Stock" / "Out of Stock") is **derived** from `quantity`
and `low_stock_threshold`. Do not store it.

**Buyer visibility rule:** a product is visible to buyers only when
`listing_status = 'published'` **AND** its supplier profile `status = 'approved'`.
Enforce this in a repository-level scope so it can't be forgotten per-endpoint.

### 6.8 `product_image`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| product_id | uuid NOT NULL FK → product | |
| path | varchar(500) NOT NULL | Local path for Phase 1 |
| alt_text | varchar(255) NULL | |
| sort_order | int NOT NULL default 0 | |
| is_primary | boolean NOT NULL default false | |

### 6.9 `cart`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid NOT NULL **UNIQUE** FK → user | One active cart per user |
| created_at / updated_at | timestamptz | |

No totals here. They are computed from items.

### 6.10 `cart_item`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| cart_id | uuid NOT NULL FK → cart | |
| product_id | uuid NOT NULL FK → product | |
| quantity | int NOT NULL, must be > 0 | |
| created_at / updated_at | timestamptz | |

**UNIQUE (cart_id, product_id).** Adding an existing product increments quantity rather
than inserting a second row.

**No price column — deliberately.** Carts show live prices. The snapshot happens only at
checkout.

### 6.11 `order`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_number | varchar(32) NOT NULL UNIQUE | e.g. `ORD-2026-00123`, from `order_number_seq` |
| user_id | uuid NOT NULL FK → user | |
| organisation_id | uuid NULL FK → organisation | Snapshot of buyer's org at order time |
| supplier_profile_id | uuid NOT NULL FK → supplier_profile | Denormalised — see invariant |
| status | enum `order_status` NOT NULL | |
| subtotal | numeric(10,2) NOT NULL | |
| gst_total | numeric(10,2) NOT NULL | |
| total | numeric(10,2) NOT NULL | |
| placed_at | timestamptz NOT NULL | |
| cancellation_reason | text NULL | |
| created_at / updated_at | timestamptz | |

**Invariant:** every `order_item` in an order must belong to a product owned by that
order's `supplier_profile_id`. This holds because checkout splits a multi-supplier cart
into one order per supplier. Add an integration test asserting it.

### 6.12 `order_item`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_id | uuid NOT NULL FK → order | |
| product_id | uuid NOT NULL FK → product | Reference only, never for display |
| product_name | varchar(255) NOT NULL | **Snapshot** |
| sku | varchar(64) NOT NULL | **Snapshot** |
| quantity | int NOT NULL | |
| unit_price_at_purchase | numeric(10,2) NOT NULL | **Snapshot** |
| line_total | numeric(10,2) NOT NULL | |

Name and SKU are snapshotted alongside price so a renamed or retired product never alters
a historical order or its invoice.

### 6.13 `payment`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_id | uuid NOT NULL **UNIQUE** FK → order | |
| method | enum `payment_method` NOT NULL | |
| status | enum `payment_status` NOT NULL default `pending` | |
| amount | numeric(10,2) NOT NULL | |
| transaction_reference | varchar(100) NULL | Mock reference in Phase 1 |
| card_last4 | varchar(4) NULL | Display only |
| card_brand | varchar(30) NULL | Display only |
| paid_at | timestamptz NULL | |
| created_at / updated_at | timestamptz | |

**Never add `card_number`, `cvc`, or `expiry` columns.** Storing a CVC is prohibited under
PCI DSS even for real processors, and checkout here is mocked. If a form collects them,
they are validated in memory and discarded.

### 6.14 `invoice`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_id | uuid NOT NULL **UNIQUE** FK → order | |
| invoice_number | varchar(32) NOT NULL UNIQUE | e.g. `INV-2026-00001` |
| issued_at | timestamptz NOT NULL | |
| seller_business_name | varchar(255) NOT NULL | **Snapshot** |
| seller_abn | varchar(11) NOT NULL | **Snapshot** — mandatory on an AU tax invoice |
| buyer_organisation_name | varchar(255) NOT NULL | **Snapshot** |
| buyer_address | text NOT NULL | **Snapshot** |
| subtotal | numeric(10,2) NOT NULL | |
| gst_total | numeric(10,2) NOT NULL | Must be shown separately |
| total | numeric(10,2) NOT NULL | |
| pdf_path | varchar(500) NOT NULL | Stored file, re-downloadable |
| created_at | timestamptz | |

`invoice_number` comes from its own gapless sequence, **not** derived from `order_number`
or `order.id`. Cancelled orders never produce an invoice, which would otherwise leave gaps.

`order_number` comes from `order_number_seq` (a plain Postgres sequence, not gapless): a
declined payment or a rolled-back checkout still consumes a number, since `nextval()` is
not undone by a transaction rollback. That is what makes it safe under concurrency — two
simultaneous checkouts can never be handed the same number — and the resulting gaps are
acceptable here, unlike for `invoice_number`.

No `invoice_line` table — lines read from `order_item`, which is safe only because those
values are already frozen. **Assumption to preserve: orders are immutable once placed.**

### 6.15 `carrier`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | varchar(120) NOT NULL UNIQUE | e.g. Australia Post |

### 6.16 `delivery`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_id | uuid NOT NULL **UNIQUE** FK → order | |
| attention_name | varchar(150) NULL | |
| street_address | varchar(255) NOT NULL | |
| suburb | varchar(120) NOT NULL | |
| state | varchar(10) NOT NULL | |
| postcode | varchar(10) NOT NULL | |
| country | varchar(60) NOT NULL default `Australia` | |
| notes | text NULL | |
| carrier_id | uuid NULL FK → carrier | |
| tracking_number | varchar(100) NULL | Lives here only, not on order |
| dispatched_on | date NULL | |
| estimated_delivery | date NULL | |
| delivered_at | timestamptz NULL | |
| created_at / updated_at | timestamptz | |

### 6.17 `inventory`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| organisation_id | uuid NOT NULL FK → organisation | The buyer's shelf, not the supplier's |
| product_id | uuid NOT NULL FK → product | |
| quantity_on_hand | int NOT NULL default 0 | |
| updated_at | timestamptz | |

**UNIQUE (organisation_id, product_id).**

This is a different number from `product.quantity`:

| Number | Whose | Changes when |
|---|---|---|
| `product.quantity` | Supplier's sellable stock | Order **placed** → decrement |
| `inventory.quantity_on_hand` | Buyer organisation's shelf | Order **delivered** → increment |

One action must never touch both.

---

## 7. Enums

```
user_status        : active | suspended | pending
user_role_type     : buyer | seller | collection_manager | admin
supplier_status    : pending_review | approved | rejected
listing_status     : draft | published | retired
order_status       : placed | confirmed | picking | dispatched | delivered | cancelled
payment_method     : card_mock | invoice_on_account
payment_status     : pending | paid | failed
```

**`order_status` is the single source of truth** and resolves a known open question: the
seller UI and buyer UI use different vocabularies for the same states. Map in the
presentation layer, never store two status columns.

| DB value | Buyer UI | Seller UI |
|---|---|---|
| placed | Placed | Received |
| confirmed | Confirmed | Received |
| picking | Confirmed | Picking & Packing |
| dispatched | Dispatched | Dispatched |
| delivered | Delivered | Delivered |
| cancelled | Cancelled | Cancelled |

---

## 8. Indexes

Beyond primary keys, unique constraints and automatic FK indexes:

- `product (listing_status, category_id)` — catalogue browse
- `product (supplier_profile_id, listing_status)` — seller catalogue
- `order (user_id, placed_at DESC)` — buyer order history
- `order (supplier_profile_id, status)` — seller order queue
- `order (status, placed_at DESC)` — admin oversight
- `supplier_profile (status)` — admin verification queue
- Full-text or trigram index on `product.name` for keyword search

---

## 9. Migration workflow

Use the TypeORM CLI against `data-source.ts`. Add scripts to `packages/entities`:

```
migration:generate   -> typeorm-ts-node-commonjs migration:generate -d src/database/data-source.ts
migration:run        -> typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts
migration:revert     -> typeorm-ts-node-commonjs migration:revert -d src/database/data-source.ts
```

Rules:

1. Change entity classes first, then **generate** the migration. Do not hand-write DDL
   unless generation cannot express it (e.g. a trigram index).
2. **Always read the generated migration before running it.** Generation regularly
   produces destructive statements when it misreads a rename as a drop-plus-add.
3. One migration per logical change, with a descriptive name.
4. Never edit a migration that has been run and committed. Write a new one.
5. Every migration needs a working `down()`. Test it with `migration:revert`.

Suggested first sequence: identity tables → catalogue → cart/order → billing/fulfilment →
inventory → indexes. Separate migrations make failures easier to isolate.

---

## 10. Seed data

Location: `packages/entities/src/seeds`, runnable via `pnpm db:seed`, idempotent —
safe to run repeatedly, and able to build from empty after `db:reset`.

**Deliberately mirror the values used in the designs**, so a running app looks like the
mockups and screenshots stay useful as acceptance references.

### Organisations
SA Clinics Pty Ltd · WorkSafe Pty Ltd · Mining Co Pty Ltd · Transport Ltd · Safety Corp

### Users
All with the same known dev password (e.g. `Password123!`), hashed. Never a real password.

| Name | Email | Roles | Org |
|---|---|---|---|
| Jordan Shaw | j.shaw@saclinics.com.au | buyer, collection_manager | SA Clinics |
| Priya Nair | priya@bindimedsupply.com.au | seller | — |
| Alex Morgan | a.morgan@sampleassist.com.au | admin | — |
| Sarah Chen | s.chen@miningco.com.au | buyer | Mining Co |

Jordan holds **two roles deliberately** — that account is the live proof of the
shared-account requirement and should be used to test it.

### Supplier profiles

| Business | ABN | Status |
|---|---|---|
| Bindi MedSupply Pty Ltd | 51824753556 | approved |
| SafetyFirst Distribution | 82601334218 | approved |
| Cheap Test Kits Direct | 00000000000 | rejected, reason: ABN could not be verified |
| (one more) | — | pending_review — so the admin queue is never empty |

### Categories
Collection Kits · Rapid Tests · Chain of Custody · Supplies · PPE

### Products (Bindi MedSupply unless noted)

| Name | SKU | Price | Qty | Status |
|---|---|---|---|---|
| Urine Collection Kit - Standard | UCK-001 | 24.99 | 450 | published |
| Oral Fluid Rapid Test | OFT-002 | 18.50 | 280 | published |
| Hair Follicle Test Kit | HFT-003 | 89.00 | 12 | published (low stock) |
| Chain of Custody Forms (50pk) | COC-004 | 12.00 | 1200 | published |
| Breath Alcohol Mouthpieces (100pk) | BAM-005 | 32.00 | 340 | published |
| Blood Collection Tubes Set | BCT-006 | 45.00 | 0 | published (out of stock) |
| Disposable Nitrile Gloves (100pk) | NGL-007 | 15.50 | 800 | published (SafetyFirst) |
| Biohazard Specimen Bags (200pk) | BSB-008 | 9.75 | 0 | draft |

This mix is intentional: in-stock, low-stock, out-of-stock, draft, and a second supplier —
enough to exercise every catalogue state and multi-vendor splitting without more data.

A further **30 published products** (`UCK-011` … `CKT-040`) follow, covering volume rather
than state: **40 products in total, 37 buyer-visible**. They fill every category chip
including both sub-categories, spread across the three price chips (11 under $20, 14 from
$20–50, 12 over $50), and give SafetyFirst 9 listings so multi-vendor carts are realistic.
Two more are low or out of stock. At the default page size of 10 the catalogue is 4 pages.

### Orders

| Order | Buyer org | Status | Extras |
|---|---|---|---|
| ORD-2026-00122 | WorkSafe | delivered | invoice, delivery, payment paid |
| ORD-2026-00123 | Safety Corp | delivered | invoice |
| ORD-2026-00124 | Transport Ltd | dispatched | tracking `AU9123456789`, Australia Post |
| ORD-2026-00125 | Mining Co | picking | multi-line |
| ORD-2026-00126 | WorkSafe | placed | no invoice yet |

Invoices for delivered and dispatched orders only, numbered `INV-2026-00001` upward.

### Inventory
Rows for SA Clinics against several products, so the CM inventory screen has content.

### Carriers
Australia Post · StarTrack

---

## 11. Verification checklist

The database layer is done when all of these pass from a clean machine:

- [ ] `pnpm db:reset` recreates an empty database
- [ ] `pnpm migration:run` builds the full schema with no errors
- [ ] `pnpm db:seed` populates it, and running it twice does not duplicate or fail
- [ ] `pnpm migration:revert` cleanly reverses the most recent migration
- [ ] The customer API boots and connects
- [ ] `psql` shows every table, enum, unique constraint and index from this document
- [ ] Jordan Shaw resolves to **one** user row with **two** role rows
- [ ] A product from an unapproved supplier is not returned by the buyer-visible query
- [ ] `order_item.unit_price_at_purchase` is unchanged after editing the product's price
- [ ] No column anywhere stores a card number, CVC or expiry

---

## 12. Do not build

Out of Phase 1 — do not create tables, columns or seeds for any of these:

commission or settlement tables · customer-specific or negotiated pricing tables ·
supplier suspension or offboarding state · store-link / attribution tracking ·
ratings and reviews · stock movement audit log (Phase 2) · analytics or reporting
aggregates · notification tables · Redis or any cache layer · real payment gateway
references.

If a design or the reference repo suggests one of these, skip it and note the decision.
