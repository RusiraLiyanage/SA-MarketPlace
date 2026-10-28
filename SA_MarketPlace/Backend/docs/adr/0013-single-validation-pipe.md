# ADR 0013 — One validation pipe, no hand-written value conversion

## Context
The reference repo's `app.pipe.ts` carries three pipes. `SAParseIntPipe` validates integer
ids and leaves a `console.log` behind. `SAValidationPipe` replaces every validation message
with a bare "Bad Request". `QueryParserAndValidationPipe` converts any all-digit query
string to a number and splits values on commas.

## Decision

One `AppValidationPipe`, registered globally in `main.ts`: `transform`, `whitelist`,
`forbidNonWhitelisted`, and `enableImplicitConversion`. DTO property types decide
conversion; there is no custom converter.

## Consequences

- `?postcode=0800` on a string field stays `'0800'`. The reference converter would
  produce `800`.
- A body carrying a field the DTO does not declare, such as `role: 'admin'`, is rejected
  with 400 instead of being silently dropped.
- Validation messages reach the client, joined by `AllExceptionsFilter`.
- UUID route parameters use Nest's `ParseUUIDPipe`, since primary keys are UUIDs.
- The customer-facing e2e suite asserts all of the above.
