# ADR 0044 — Swagger fields are declared explicitly where auto-detection fails

## Context
Swagger builds request bodies from the DTO classes using the Nest Swagger compiler plugin.
It misses some fields: password fields with only a `@Matches` rule left the body empty, a
regex on a path parameter was copied with its slashes (`/^ORD-…$/`, which no value matches,
so Swagger UI blocked every request), and file uploads handled by multer never appear.

## Decision

Where the generated docs are wrong or missing, the DTO declares the field with
`@ApiProperty` or `@ApiPropertyOptional`: `password` and `newPassword` on register, reset
and change-password, `OrderNumberParamDto.orderNumber` with a plain pattern, and `images`
(binary files) on product create and update. The `images` field carries `@IsOptional()` only
so Swagger's example JSON is not rejected as an unknown field; multer, not the body, supplies
the files.

## Consequences

- Swagger shows every field, with an example, and the Try it out forms work.
- A new DTO field with only a custom or `@Matches` decorator needs checking in `/docs`.
- The value of a documented-only field is ignored by the service.
