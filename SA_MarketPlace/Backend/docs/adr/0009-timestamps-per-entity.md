# ADR 0009 — Timestamps declared on every entity, no base class

## Context
Every table carries `created_at` and `updated_at`. A shared abstract base class would
remove the repetition.

## Decision

Declare both columns directly on all 17 entities, as the final two members, with
`type`, `name` and `default` stated explicitly.

## Consequences

- Each entity reads as a complete description of its table with no indirection.
- The primary key could not have lived in a shared base anyway, since
  `primaryKeyConstraintName` differs per table.
- `updatedAt` is maintained by TypeORM on save. The column default only fires on insert,
  so raw SQL updates — including the seed — do not move it. No trigger was added; the
  specification does not ask for one.
