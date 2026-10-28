# ADR 0007 — uuidExtension: 'pgcrypto' for gen_random_uuid parity

## Context
Our migrations default uuid primary keys to `gen_random_uuid()`, built into Postgres
since 13 and needing no extension. TypeORM's `@PrimaryGeneratedColumn('uuid')` expects
`uuid_generate_v4()` and installs `uuid-ossp` during `migration:generate`.

Three options were measured on a single spike entity:

| | Result |
|---|---|
| default | empty diff, installs uuid-ossp, would emit `uuid_generate_v4()` |
| `uuidExtension: 'pgcrypto'` | empty diff, installs pgcrypto, emits `gen_random_uuid()` |
| `@PrimaryColumn` + explicit default | no extension, but a PERMANENT false-positive diff |

## Decision

`uuidExtension: 'pgcrypto'`.

## Consequences

- The third option was rejected outright: it generates an `ALTER` setting the default to
  `gen_random_uuid()` when the column already has exactly that, which would make the
  empty-diff check worthless for every entity.
- TypeORM's uuid function now agrees with the schema, so any DDL it emits stays
  consistent instead of introducing a second UUID mechanism.
- `migration:generate` installs an inert `pgcrypto` extension, so a database it has run
  against is not identical to a fresh `db:reset`.
