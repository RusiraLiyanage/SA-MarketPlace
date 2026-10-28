# SA Marketplace — Project Context

Context file for Claude Code. Read this fully before making changes.

---

## 1. What this project is

A workplace drug-and-alcohol-testing **consumables marketplace** for Sample Assist,
built as an intern project over ~12 weeks. Two buyer-facing surfaces and two
operator-facing surfaces, all on **one shared backend and one database**.

> **The single most important architectural rule, taken directly from the brief:**
> Do not build separate systems that sync. Build **one system with multiple
> front-end entry points**. A person who is both a Collection Manager user and a
> marketplace buyer must see the same account, the same order history, and the
> same inventory across both.

### The four surfaces

| Surface | Who uses it | Auth |
|---|---|---|
| **Collection Manager (CM) store** | Existing CM users ordering consumables in-product | Sample Assist SSO |
| **Customer marketplace** | Any buyer, public storefront | Own email/password |
| **Seller portal** | Verified supplier businesses (e.g. Bindi MedSupply) | Own email/password |
| **SA Admin** | Sample Assist staff | Own email/password; registration limited to allowed work-email domains (ADR 0038) |

---

## 2. Tech stack (fixed — do not swap frameworks)

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React + Vite | SPA. Ant Design for marketplace/seller/admin. CM store matches existing CM styling (not AntD). |
| Backend | NestJS | REST API, modular |
| ORM | TypeORM | Entities + **migrations only**, never hand-edit the DB |
| Database | PostgreSQL (Docker) | Local container |
| Cache | Redis (Docker) | **Phase 3 bonus only — do not add yet** |
| Monorepo | pnpm workspaces + Turborepo | |
| Deployment | **Local only** | No cloud, no CI/CD yet |

---

## 3. Repository layout (target)

Root: `/Users/rusiraliyanage/Documents/Intern Project/SA Market Place`

```
SA Market Place/
├── Backend/                   <- pnpm + turbo workspace root
│   ├── package.json           (private, packageManager pinned, turbo scripts)
│   ├── pnpm-workspace.yaml    (apps/*, packages/*)
│   ├── turbo.json             (build depends on ^build; dev persistent, uncached)
│   ├── packages/
│   │   ├── tsconfig/          base.json + nest.json (decorators ON)
│   │   ├── eslint-config/     minimal shared lint
│   │   ├── entities/          database module + all TypeORM entities, grouped by domain
│   │   └── common/            app config, middlewares, guards, constants, helpers, index.ts
│   └── apps/
│       ├── customer-facing/   <- BUILD THIS FIRST
│       ├── supplier-api/
│       └── admin-api/
└── Frontend/
```

### Reference architecture

Mirror the **shape** of the existing Sample Assist backend at:

```
/Users/rusiraliyanage/Innomenate_Code_Space/Backend-Services
```

**Copy:** workspace/turbo wiring, tsconfig + eslint package pattern, entities package
structure, database module pattern, common package layout, app internal structure.

**Do NOT copy:** CI/CD, production Dockerfiles, multi-stage builds, k8s/Helm,
monitoring/APM, feature flags, or auth tied to their existing identity provider.
This project is deliberately simpler and local-only.

---

## 4. Data model

An ER diagram was drafted and reviewed. The corrections below are **agreed and must
be reflected in the entities** — the original draft had structural gaps.

### 4.1 Identity — one user, many roles

Three separate account tables (Customer / Supplier / Admin) were **collapsed**, because
separate tables break the shared-account requirement.

```
User               (id, organisation_id FK, email UK, password_hash,
                    first_name, last_name, phone, status, created_at, updated_at)
UserRole           (id, user_id FK, role)     -- buyer | seller | collection_manager | admin
Organisation       (id, name, abn, billing_address)
SupplierProfile    (id, user_id FK, business_name, abn, business_type, status,
                    approved_by_user_id FK, approved_at, rejection_reason,
                    dispatch_sla_hours, default_carrier)
```

- `User.email` is **globally unique**. One email = one account, roles layered on top.
- A single account can hold more than one role (explicit brief requirement).
- `Product.supplier_profile_id` points at the **profile (the business)**, not the user —
  so Phase 3 multi-user seller accounts don't require migrating every listing.
- `approved_by_user_id` points at a **User** (a specific human admin).
- Route guards enforce role access per app; the data model merely permits multi-role.

### 4.2 Junction entities (were missing entirely)

```
CartItem   (id, cart_id FK, product_id FK, quantity)
OrderItem  (id, order_id FK, product_id FK, quantity,
            unit_price_at_purchase, line_total)
```

**The price-freezing rule:** `CartItem` deliberately has **no price column** — carts show
live prices. The snapshot happens exactly once, at checkout, when each CartItem is copied
into an OrderItem and `unit_price_at_purchase` is written. That moment is the boundary
between live data and historical record. Without it, editing a product price silently
rewrites past orders and invoices.

`Cart` keeps only `(id, customer_id, updated_at)`. Totals are computed, never stored.

### 4.3 Multi-vendor: split orders at checkout

One cart may contain products from multiple suppliers. **One order may not.**
At checkout, group cart items by supplier and create **one order per supplier**.

Reason: fulfilment is per-supplier. A shared order has no answer for whose SLA counts
down, who sees it in their Orders list, who dispatches it, or whose ABN goes on the
invoice (an Australian tax invoice has exactly one seller).

Supplier is derivable via `OrderItem → Product → SupplierProfile`. Denormalising
`supplier_profile_id` onto `Order` is acceptable **only because** the split enforces the
one-supplier invariant — if done, add a constraint/test asserting all order items belong
to that supplier.

### 4.4 Invoice — a frozen document, not a view

```
Invoice (id, order_id FK, invoice_number UK, issued_at,
         seller_business_name, seller_abn,
         buyer_organisation_name, buyer_address,
         subtotal, gst_total, total, pdf_path)
```

- Seller and buyer details are **copied onto the row at issue**, not joined at render
  time. Otherwise a business rename rewrites already-issued invoices.
- `invoice_number` has its **own gapless sequence** (e.g. `INV-2026-00001`), separate
  from `order_number` — orders can be cancelled before invoicing, leaving holes.
- No `InvoiceLine` entity: lines read from `OrderItem`, which is safe **only because**
  `unit_price_at_purchase` is already frozen. Assumption to preserve: **orders are
  immutable once placed.** If partial cancellation is ever added, `InvoiceLine` becomes
  necessary.
- All "Download invoice" buttons across buyer, seller and admin apps serve this same
  row and the same `pdf_path`. One document, three audiences, no regeneration.

### 4.5 Inventory — two different stock numbers

```
Inventory (id, organisation_id FK, product_id FK, quantity_on_hand, updated_at)
           UNIQUE (organisation_id, product_id)
```

| Number | Whose | Changes when |
|---|---|---|
| `Product.quantity` | Supplier's sellable stock | Order **placed** → decrement |
| `Inventory.quantity_on_hand` | Buyer organisation's shelf stock | Order **delivered/received** → increment |

Two events, two columns. One action must not touch both.
Inventory hangs off **Organisation**, not User — shelf stock belongs to the clinic.

**Open issue:** with only these triggers, CM inventory can only ever increase.
Consumption happens during collections in the existing CM. Confirm whether the existing
CM already decrements, or whether Phase 1 needs a manual adjustment field.

### 4.6 Payment — PCI

```
Payment (id, order_id FK, method, status, amount, transaction_reference, paid_at)
```

**Never store `card_no`, `cvc`, or `expiry`.** Storing CVC is prohibited under PCI DSS
even for real processors, and checkout here is mocked anyway. For display, store
`card_last4` and `card_brand` only.

### 4.7 Other model rules

- **Category** is an entity; `Product` uses `category_id` FK. Do not also keep
  `category`/`sub_category` string columns.
- **Specification** duplicated Product fields (category, sub-category, pack size,
  certification). Either merge into Product or keep those fields only in Specification —
  never both.
- **Product is never hard-deleted.** "Retire" sets `listing_status`
  (draft | published | retired). Historical orders reference products.
- **Stock status is derived** from quantity, never stored alongside it.
- `created_at` / `updated_at` on every entity (audit trail requirement).
- Tracking number lives on **Delivery** only, not also on Order.
- Fix these typos before they become column names: `manufactorer` → `manufacturer`,
  `referenace`/`referance` → `reference`, `self life` → `shelf_life`,
  `street_adress` → `street_address`.

### 4.8 Additional required fields

| Entity | Fields |
|---|---|
| Order | `order_number` (e.g. ORD-2026-00123), `status`, `cancellation_reason` |
| Product | `listing_status`, `low_stock_threshold` |
| SupplierProfile | `rejection_reason`, `dispatch_sla_hours`, `default_carrier` |

---

## 5. Phase 1 scope (the committed MVP)

### In scope

- Registration + login. Roles: buyer, seller, collection-manager, admin. One account,
  multiple roles.
- Products: name, description, images, category, GST-inclusive price, stock quantity.
  Seller-owned listings.
- Buyer browse: product list, keyword search, filter by **category and price range**,
  product detail page.
- Cart, checkout, **mock/sandbox payment only** (no real money, no gateway).
- Orders: creation, status, order history for buyers and sellers.
- **Electronic invoice**: downloadable PDF tax invoice per order (seller + buyer details,
  line items, GST, totals, invoice number, date), stored and re-downloadable.
- Seller onboarding: sign-up with business details (ABN, business name, contact).
- Seller verification: admin approves/rejects. **Listings from unverified sellers are not
  visible to buyers.**
- CM ordering: browse and order inside Collection Manager on the same backend.
- Inventory update on placing/receiving.
- Shared data across both buyer surfaces.

### Explicitly OUT of Phase 1

Commissions / margins / settlements · real payments or any real money movement ·
customer-specific or negotiated pricing · ABN Lookup API automation (**manual admin
check in Phase 1**; format/checksum validation on the form is fine and in scope) ·
supplier offboarding · supplier suspension · seller Store Link / external selling ·
ratings & reviews · sales analytics dashboards · admin reporting dashboards
(**Phase 3**) · shipping-carrier integrations · multi-currency · mobile apps ·
production deployment.

Do not build these. If a design or reference repo suggests them, skip.

### Phase 2 / 3 (context only, not now)

- **Phase 2 ≈ automation and money:** ABN Lookup API, commission engine, settlements,
  customer-specific pricing (backend + both buyer frontends + seller management UI),
  ratings & reviews, seller analytics, Store Link, real payment gateway, saved addresses,
  responsive/mobile.
- **Phase 3 ≈ reporting and reach:** admin reporting dashboard, Redis caching, deeper
  seller analytics, multi-user seller accounts, notifications centre, recurring orders,
  additional suppliers onboarded, audit logging, performance work.

**Planning note:** every buyer-facing feature is *two* frontend tickets (CM + marketplace)
plus one backend ticket, because the two surfaces deliberately do not share a component
library.

---

## 6. Designs

All screens designed as SVG (importable to Figma, editable text/vector layers).
Each app has a distinct primary colour so the surfaces read as separate products —
in AntD this is one `ConfigProvider` token swap.

| App | Primary | Notes |
|---|---|---|
| CM store | Navy `#00004C`, blue `#156CC9`, active tab `#1A5D78` | Matches existing CM chrome, **not** AntD |
| Customer marketplace | Blue `#0958D9` (was AntD `#1677FF`; darkened so white text passes WCAG AA) | 1440px, no sidebar; top header + no footer |
| Seller portal | AntD orange `#FA8C16` | 240px left sidebar |
| SA Admin | AntD purple `#722ED1` | 240px left sidebar |

Shared AntD tokens: success `#52C41A`, warning `#FAAD14`, error `#FF4D4F`,
border `#D9D9D9`, border-light `#F0F0F0`, layout bg `#F5F5F5`.

### Screen inventory

**CM store** — Catalogue (default / list view / sort dropdown / store dropdown),
Catalogue with price-range filter, Cart, Product Detail, Checkout, Checkout (card
payment), My Orders (default / status dropdown / store dropdown / order detail modal).

**Customer marketplace (13)** — 1 Catalogue · 2 Product Detail · 3 Cart ·
4 Checkout (Delivery) · 4b Checkout (Payment) · 5 Order Confirmation · 6 My Orders ·
7 Order Detail · 8 Add-to-Cart States · 9 Items-per-page Dropdown · 10 Login ·
11 Register · 12 Edit Profile.

**Seller portal (18)** — 0 Login · 0b Forgot Password · 0c Reset Link Sent · 1 Signup ·
2 Pending Verification · 2b Rejected · 2c Approved · 3 Dashboard · 3b Dashboard Empty ·
4 Orders · 4b Orders Empty · 5 Order Fulfilment · 5b Cancel Order · 6 Catalogue
Management · 6b Catalogue Empty · 7 Edit Product · 8 Business Profile ·
9 Dispatch Button States.

**SA Admin (11)** — 0 Login · 0b Register · 1 Supplier Verification ·
1b Verification Empty · 2 Application Review · 2b Reject Modal · 2c Approve Modal ·
3 All Orders · 3b Orders Empty · 4 Order Detail · 5 My Profile.

### UI behaviour rules established during design

- **Add to cart:** product cards show a plain "Add to cart" button by default. The
  `– qty +` stepper appears **only after** the item is actually in the cart. Reducing to
  0 reverts to the button. The stepper must never render on page load for an empty cart.
- **Pagination:** `"N of M"` left, centred `< 1 >` controls, page-size **dropdown** right
  with options **10 / 20 / 30**.
- **Filters:** category chips AND price-range chips (Any price / Under $20 / $20–50 /
  $50+) combine with search using AND logic.
- **Confirm dispatch** stays disabled until every pick-list item is checked, with a
  warning banner explaining why. Never disable a control without saying why nearby.
- **Verification outcomes** all have screens: Pending → Approved or Rejected, each with a
  clear next action. Rejection reason entered by admin surfaces on the seller's
  Rejected screen.
- **Admin approval** is the switch that makes listings visible to buyers — not a separate
  publish step.
- Empty states designed for seller dashboard/orders/catalogue and admin
  verification/orders.
- Seller catalogue pricing is **direct edit** — no "request confirmation from Sample
  Assist" loop. Sellers set their own prices (explicit brief requirement).

---

## 7. Working guardrails (from the brief)

- **This brief is the source of truth.** Record assumptions and decisions in the repo.
- Everything runs **locally**. Databases in Docker. No cloud, no external data pushes.
- **Never commit secrets.** No `.env` in git; use an env-var pattern.
- **No real payments, no real personal or health data.** Seed/fake data only.
- Domain sensitivity: validate input, hash passwords, guard every route by role,
  never expose one user's data to another. Suppliers must not see competing suppliers'
  data.
- **Definition of done:** meets the requirement · has tests (backend unit/integration
  minimum, feature works end-to-end through the UI) · passes lint + type checks with no
  new errors · DB changes via TypeORM **migrations** · runs clean from a fresh checkout
  with documented setup · merged via a self-reviewed PR · anything non-obvious documented.
- Small, frequent commits and PRs. Never push broken code to main.
- **No AI-generated code without revision.** Understand and review everything.

---

## 8. Build order

1. **Recon** the reference repo (see §3) — note the npm scope, whether packages export
   `src` or `dist`, how the database module receives config, and the Turbo version
   (`pipeline` vs `tasks`).
2. Root scaffold: `pnpm init`, `pnpm-workspace.yaml`, `turbo.json`, `.gitignore`.
   Verify with `pnpm turbo run build` (zero tasks = wiring correct).
3. `packages/tsconfig` + `packages/eslint-config`. Decorators must be enabled.
4. `packages/entities` — database module + entities from §4 + barrel export.
5. `packages/common` — config, middleware, guards, constants, helpers. **No Redis.**
6. `apps/customer-facing` — scaffold, rewire to consume workspace packages.
7. Postgres in Docker, first migration, verify boot + DB connection.
8. Then APIs for the customer app.

---

## 9. Open questions — decide and record

1. **Auth split:** CM users arrive via Sample Assist SSO; marketplace buyers use
   email/password. Same `User` row — so does an SSO-provisioned user also get a password,
   or can the marketplace accept SSO for them?
2. **Order status vocabulary:** seller side uses Received → Picking & Packing →
   Dispatched → Delivered; buyer side uses Placed → Confirmed → Dispatched → Delivered.
   These must collapse onto **one backend enum** — define the mapping.
3. **Inventory decrement** — see §4.5.
4. **Organisation on registration** is currently free text; it needs dedup before Phase 2
   organisation pricing depends on it.
5. **Approved-seller screen trigger:** interstitial on first sign-in after approval, or
   linked from the approval email? (Interstitial is simpler.)
6. **Cancellation reasons** — define the enum (out of stock, cannot meet SLA, pricing
   error, other?).
7. **Changing sign-in email** should trigger re-verification of the new address; designs
   imply editability but don't show the flow.
8. ~~**Admin invite creation**~~ — **Decided: no invitations.** Admin sign-up is limited to
   allowed work-email domains (`ADMIN_EMAIL_DOMAINS`) and the `admin_invite` table is
   dropped (ADR 0038). Nothing verifies the address, so this is a speed bump, not a lock.

---

## 10. Caveat on this document

This was assembled from the project brief, pasted requirement notes, and design
decisions made in conversation. **Only part of the original PDF brief was visible** during
that work. Before treating any scope call here as final — particularly the Phase 2 vs
Phase 3 split — verify against the full brief document.
