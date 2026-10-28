# ADR 0018 — Logout bumps a token version on the user row

## Context
A JWT cannot be withdrawn. Once signed it stays valid until it expires, so a purely
stateless logout is only the frontend deleting its copy — a stolen or copied token keeps
working for the rest of the 15 minutes.

This platform approves and suspends accounts (CLAUDE.md §7, domain sensitivity). "Suspended
but still working for another 15 minutes" is not acceptable. The alternatives were a Redis
blacklist (§2 puts Redis in Phase 3) or a session table per device.

## Decision

`user.token_version` is an integer, default 0, added by
`1789470821398-AddUserTokenVersion`. Every token carries the version it was signed with.
`JwtStrategy.validate()` rejects a token whose version no longer matches the row, and
`POST auth/logout` increments it.

## Consequences

- Logout takes effect immediately, everywhere, and so does suspending an account: the same
  `validate()` also rejects any user who is no longer `active`.
- One indexed lookup by primary key per authenticated request. Acceptable locally; Redis
  can cache it in Phase 3 if it ever shows up in a profile.
- **Logout signs the user out on every device**, because the counter is per user, not per
  session. Logging in again does not disturb other devices — only logout does. Per-device
  sessions need a session table, which is Phase 3 work.
- A column, not a nullable refresh-token hash: an integer cannot leak a credential, and
  bcrypt would have compared only the first 72 bytes of a token anyway.
