# ADR 0006 — A naming strategy instead of explicit column names

## Context
The reference repo writes `@Column({ name: 'created_at' })` on every column. DATABASE.md
§3 instead specifies a `naming.strategy.ts`.

## Decision

`SaNamingStrategy` (wrapping `typeorm-naming-strategies`' SnakeNamingStrategy) maps
camelCase properties to snake_case columns in one place.

## Consequences

- Roughly 200 fewer `name:` declarations across 17 entities, and no chance of a typo in
  one of them.
- Both database entry points must use the same strategy or the CLI and the running app
  disagree about column names; `database.options.ts` enforces that structurally.
- `createdAt`/`updatedAt` do state `name:` explicitly — see ADR 0009.
