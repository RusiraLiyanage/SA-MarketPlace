# ADR 0015 — Middleware wildcard is '*' on Nest 10

## Context
The reference repo registers its XSS middleware with `forRoutes('/{*any}')`. A probe on
`@nestjs/core` 10.4.22, using URI versioning like `main.ts`, applied a marking middleware
with three patterns:

| Pattern | Middleware ran |
|---|---|
| `'*'` | yes |
| `'/{*any}'` | no |
| `'(.*)'` | no |

All three returned HTTP 201 with no warning, so the failure is silent.

## Decision

`consumer.apply(XssProtectionMiddleware).forRoutes('*')`.

## Consequences

- XSS sanitising actually runs. The e2e suite asserts `<script>` is stripped from POST,
  PUT and PATCH bodies.
- Nest 11 changed wildcard syntax. Revisit this on upgrade; the e2e XSS tests fail if the
  middleware silently stops running.
