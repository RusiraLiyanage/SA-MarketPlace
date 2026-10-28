# ADR 0010 — The seed clears its tables and generates ids

## Context
DATABASE.md §10 requires the seed to be idempotent. An earlier version used hardcoded
literal UUIDs with `ON CONFLICT DO NOTHING`, which was rejected on review as unreadable.

## Decision

No id column is ever written. The seed `TRUNCATE`s the tables it owns, then inserts, and
resolves foreign keys by natural key — email, slug, SKU, order number, business name.

## Consequences

- Running it repeatedly always produces the same database.
- It REPLACES the seeded set rather than topping it up: rows added by hand to those
  tables are removed.
- Ids differ on every run, so nothing outside the seed may depend on a particular id.
- Invoices and payments derive their totals and snapshots from the order they belong to,
  so the seed cannot drift out of internal agreement.
