# ADR 0001 — Hand-written SQL migrations, not generated ones

## Context
DATABASE.md §9 says to change entity classes first and generate migrations from them.
We wanted to write the SQL by hand to understand the schema being built.

## Decision

Write the DDL by hand, but deliver it inside TypeORM migration files. The database is
still built exclusively by versioned migrations (§1.2), nothing is ever applied by hand,
and the SQL is explicit and reviewable.

Entity classes came afterwards, verified by `migration:generate` producing an empty
migration — proof the classes and the schema describe the same database.

## Consequences

- The empty-diff check became a real verification tool rather than a formality.
- Entities must declare explicit constraint names (`pk_`/`uq_`/`fk_`/`idx_`) and
  `enumName`, or generate proposes spurious changes.
- Three indexes are under-described by entity metadata; see ADR 0007 and the
  verification record.
