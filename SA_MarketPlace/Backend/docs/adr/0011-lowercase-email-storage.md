# ADR 0011 — Lowercase email storage, not a functional index

## Context
`uq_user_email` is a plain UNIQUE, so `J.Shaw@x.com` and `j.shaw@x.com` were two
accounts — contradicting DATABASE.md §6.2's "one email, one account".

The obvious fix is a unique index on `lower(email)`. TypeORM decorators cannot express a
functional index, so that would permanently break the empty-diff check.

## Decision

Store emails canonically lowercased and enforce it with
`CHECK (email = lower(email))`, which `@Check` can express.

## Consequences

- Callers must lowercase on registration and on login lookup.
- The plain UNIQUE is now effectively case-insensitive.
- `db:verify` asserts both that the constraint exists and that no stored email has mixed
  case.
