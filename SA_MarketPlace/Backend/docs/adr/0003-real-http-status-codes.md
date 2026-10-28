# ADR 0003 — Real HTTP status codes, not always-200

## Context
The reference repo's exception filter returns HTTP 200 for nearly every error, with the
real outcome in an `error` field in the body. That exists because their Guard/proxy layer
depends on it. This project has no Guard layer.

## Decision

Return truthful status codes — 400, 401, 403, 404, 409, 500 — keeping the
`{ data, error, message }` envelope.

## Consequences

- Standard REST semantics; axios and AntD error handling work without special cases on
  all four frontends.
- Diverges from the wider Sample Assist codebase, so anyone moving between them should
  expect the difference.
- `AppError` codes map to statuses in one place, `app.exception.ts`.
