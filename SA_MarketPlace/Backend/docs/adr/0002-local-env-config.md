# ADR 0002 — Local .env instead of AWS AppConfig

## Context
The reference repo loads configuration from AWS AppConfig with YAML version pinning,
about 190 lines. This project is local-only (DATABASE.md §3) and has no AWS account.

## Decision

`packages/common/src/configs/app.config.ts` reads plain environment variables from a
git-ignored `.env`, validates every required key at boot, and throws once naming all
missing keys.

## Consequences

- Drops `@aws-sdk/client-appconfig` and `js-yaml`.
- A missing `DB_PASSWORD` fails immediately with a clear message rather than surfacing
  later as an opaque connection error.
- `.env.example` is committed as the contract; `.env` never is.
