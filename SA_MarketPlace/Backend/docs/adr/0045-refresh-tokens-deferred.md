# ADR 0045 — "Keep me signed in" (refresh tokens) is deferred

## Context
Access tokens are JWTs that last `JWT_EXPIRES_IN` (15 minutes by default) and are never
renewed, so a signed-in user is signed out after 15 minutes. A "keep me signed in" option
needs a second, longer-lived credential. A skeleton was built and then removed: Phase 1 is
kept simple and the front end does not exist yet to show whether the 15-minute sign-out
actually hurts.

## Decision

Not built in Phase 1. The front end calls a protected endpoint and treats a 401 as signed
out; only 401 means that (a pending or rejected seller gets 403 on approved-only routes).
Raising `JWT_EXPIRES_IN` is the stopgap.

If it is revived, the design is:

- An opaque, single-use refresh token in an `httpOnly`, `SameSite=Strict` cookie, one name
  per app, with its path limited to `/api/<app>/v1/auth`.
- Stored hashed in a `refresh_token` table, with family replay detection: reusing a spent
  token revokes the whole family.
- Lifetime fixed from login: 30 days when the user ticks the box, 12 hours when not.
- CORS limited to the known front-end origins, with credentials allowed.

## Consequences

- No new table, cookie or CORS rule exists yet, and there is nothing to keep secure.
- Users sign in again every 15 minutes until this is built or the lifetime is raised.
- The decision should be revisited once the front end shows the real experience.
