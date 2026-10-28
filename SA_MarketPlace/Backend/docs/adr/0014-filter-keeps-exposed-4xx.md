# ADR 0014 — The exception filter keeps the status of exposed 4xx errors

## Context
A global exception filter replaces Nest's `BaseExceptionFilter`, which handles http-errors
objects through `isHttpError()`. Nest itself converts only `SyntaxError` and `URIError` into
a `BadRequestException` (`mapExternalException` in `@nestjs/core/router/routes-resolver.js`).
Every other middleware error reaches the filter untouched.

So body-parser's `PayloadTooLargeError` — status 413, `expose: true` — fell into the
catch-all branch and was returned as a 500.

## Decision

An error with a numeric 4xx `status` **and** `expose: true` keeps its status and message.
Anything else unrecognised is a generic 500.

## Consequences

- A request over the 1 MB body limit returns 413, logged as a warning, not an error.
- Server-side details never reach the client: an error carrying status 503, or a 4xx
  status without `expose: true`, still renders as a generic 500.
- `all-exceptions.filter.spec.ts` covers both the exposed and the non-exposed cases.
