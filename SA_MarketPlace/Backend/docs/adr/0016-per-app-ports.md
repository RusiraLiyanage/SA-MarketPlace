# ADR 0016 — Each app owns its port; no shared PORT

## Context
All apps share one `Backend/.env`, so a single `PORT` variable cannot serve customer,
supplier and admin APIs at once. The reference repo hardcodes a port per app.
DATABASE.md §4's environment contract has no `PORT` either.

## Decision

Each app declares `APP_PORT` in its own `app.constant.ts` — customer 8001, supplier 8002,
admin 8003. `PORT` is removed from `loadAppConfig()` and `.env.example`.

## Consequences

- No variable exists that looks configurable but is ignored.
- Changing an app's port is a code change, reviewed like any other.
- A leftover `PORT` line in an existing local `.env` is harmless; nothing reads it.
