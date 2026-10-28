# Database layer — verification record

Covers DATABASE.md §11. Last run: 2026-09-01, Postgres 16.15 (`postgres:16-alpine`),
with all 17 entity classes in place.

Most of this checklist is **re-runnable** rather than a one-off claim. The command
below asserts twenty-one properties of the schema and seed data, and every row must
read `PASS`:

```bash
pnpm db:verify
```

## Full sequence from a clean machine

```
pnpm db:up                                                # container healthy
pnpm db:reset                                             # empty database, 0 tables
pnpm --filter @sa-marketplace/entities migration:run      # 7 migrations
pnpm db:seed                                              # seed applied
pnpm db:seed                                              # applied again, no change
pnpm db:verify                                            # 21 PASS, 0 FAIL
pnpm --filter @sa-marketplace/entities db:check           # 8/8, entities 17
pnpm --filter @sa-marketplace/customer-facing test:e2e    # 5/5, needs db:up
pnpm --filter @sa-marketplace/entities migration:generate src/migrations/X   # no changes
pnpm --filter @sa-marketplace/entities migration:revert   # reverses CreateIndexes
pnpm --filter @sa-marketplace/entities migration:run      # re-applies it
```

## Entity classes agree with the schema

`migration:generate` reporting **"No changes in database schema were found"** is the
proof that the 17 entity classes and the hand-written migrations describe the same
database. Run it after any entity change; a diff is a real mismatch, named precisely.

Three indexes it does NOT check properly, because TypeORM compares indexes by name
and columns only. Entity metadata deliberately under-describes them and the
migrations remain the source of truth:

- `idx_product_name_trgm` is a GIN index using `gin_trgm_ops`, declared in the entity
  as a plain index. Left undeclared entirely, generate proposed dropping it and
  recreating it as a btree — silently destroying keyword search.
- `idx_order_user_id_placed_at` and `idx_order_status_placed_at` are `DESC` on
  `placed_at`.

Note `migration:generate` also WRITES to the database: it runs
`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`. The extension is inert —
`gen_random_uuid()` has been built into Postgres since 13 — but a database that has
had generate run against it is not identical to a fresh `db:reset`.

## §11 checklist

| Check | Result |
|---|---|
| `db:reset` recreates an empty database | PASS — 0 tables after reset |
| `migration:run` builds the full schema with no errors | PASS — 8 migrations, 17 tables |
| `db:seed` populates it; running twice does not duplicate or fail | PASS — identical row counts |
| `migration:revert` cleanly reverses the most recent migration | PASS — with seed data present; data survived, indexes dropped, re-applied cleanly |
| The customer API boots and connects | PASS — `apps/customer-facing` boots and holds a live connection (0 → 1 while running → 0 after shutdown); its e2e suite connects and loads all 17 entities |
| `psql` shows every table, enum, unique constraint and index | PASS — `db:verify` prints all four inventories |
| Jordan Shaw resolves to one user row with two role rows | PASS |
| A product from an unapproved supplier is not buyer-visible | PASS |
| `order_item.unit_price_at_purchase` unchanged after editing the product price | PASS |
| No column anywhere stores a card number, CVC or expiry | PASS — only `card_last4` and `card_brand` |

`database.module.ts` (DATABASE.md §3's second entry point) is verified two ways.

In isolation, `db:check` builds a minimal Nest context around it, resolves the
`DataSource`, and checks the entity mapping against the seeded data:

```
DatabaseModule booted and connected.
  database sa_marketplace · postgres 16.15 · entities 17 · synchronize false
  8/8 checks passed.
```

Inside the real app, `apps/customer-facing` imports it through `AppModule`. The e2e
suite proves the connection, all 17 entities loading, and XSS sanitising on POST, PUT
and PATCH bodies. While the app runs, `pg_stat_activity` shows its connection, and
shutdown releases it.

Both entry points build their options from `database/database.options.ts`, so
§3's requirement that they "point at the same database and use the same entity
list and naming strategy" is structural rather than a convention to remember.

## What `db:verify` asserts

Schema: 17 tables · 7 enum types · 7 migrations applied · every FK column has a
leading index.

PCI: no column matching `card|cvc|cvv|expiry|expiration` other than `card_last4`
and `card_brand`.

Identity: Jordan Shaw is exactly one user row holding exactly two roles.

Catalogue: the draft product is not buyer-visible; the published product owned by
a `pending_review` supplier is not buyer-visible; at least one such product exists,
so that rule is actually exercised rather than vacuously true.

Ordering: `order_item` prices are frozen at 24.99 while the live product price
moves; every order line belongs to its order's supplier (the multi-vendor split
invariant from §6.11).

Billing: invoices exist only for dispatched or delivered orders; every order total
equals `subtotal + gst_total` and equals the sum of its line totals.

Inventory: shelf stock is tracked separately from supplier stock.

## Notes on the data

`pnpm db:verify` expects migrations **and** the seed. Run it against a
migrations-only database and the data assertions will fail correctly.

Seed ids are auto-generated (`gen_random_uuid()`); the seed writes no id column.
Re-runnability comes from the seed clearing its own tables before inserting, and
foreign keys are resolved by natural key — email, slug, SKU, order number, business
name. Because ids differ on every run, nothing outside the seed may depend on a
particular id value.

The price-freezing section mutates a product price inside a transaction and rolls
back, so running the script leaves the database exactly as it found it.

## Known issues recorded during verification

- **RESOLVED — SafetyFirst's ABN.** DATABASE.md §10 gives `82601334218`, which fails
  the ABN checksum while being seeded as `approved` — data our own registration
  validator would reject. Replaced with the checksum-valid `82601334360`.
  `51824753556` (Bindi) was already valid; `00000000000` is invalid on purpose, being
  the rejected supplier. `db:verify` now asserts the checksum for approved suppliers.
- **`invoice_number` and `order_number` have no generator.** §6.14 requires a
  gapless sequence; a Postgres `SEQUENCE` advances on rollback and is not gapless.
  A counter table with row locking is needed, and that is application logic.
- **`updated_at` does not maintain itself.** `DEFAULT now()` fires on insert only.
  TypeORM's `@UpdateDateColumn` will maintain it from the app; raw SQL updates,
  including the seed, will not. A trigger is the alternative if that matters.
- **RESOLVED — email case-sensitivity.** Emails are now stored lowercase and
  `ck_user_email_lowercase` enforces it, so the plain UNIQUE is effectively
  case-insensitive. See ADR 0011. Callers must lowercase on registration and lookup.

## Decisions

Recorded in [`docs/adr/`](adr/README.md) — twelve ADRs covering hand-written
migrations, the uuid extension choice, money as string, lowercase email storage, the
seed's truncate-and-regenerate approach, and the referential actions.
