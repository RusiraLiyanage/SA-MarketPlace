# ADR 0020 — Login and sign-up are rate limited per IP, in memory

## Context
`POST auth/login` compares a password and says whether it was right. Nothing stopped a
script from asking thousands of times a minute, which makes a weak password a matter of
time. `POST auth/register` is the other guessable door: it reveals which emails already
have an account (409) and writes rows.

`@nestjs/throttler` was removed from the root during the original cleanup because nothing
used it. CLAUDE.md §7 asks for validated input and guarded routes, and this is the same
kind of gap.

## Decision

`@nestjs/throttler` 5.2.0 — the last major pinned to Nest 10 — configured inside
`AuthCoreModule` and exported, so all three apps inherit the same protection.

- **5 requests per 60 seconds per IP**, overridable with `AUTH_THROTTLE_LIMIT` and
  `AUTH_THROTTLE_TTL`. Both are optional and default to those values.
- Applied with `@UseGuards(ThrottlerGuard)` on **login and register only**, not globally:
  browsing a catalogue is not an attack.
- On login the throttler guard runs **before** `LocalAuthGuard`, so a blocked request never
  reaches bcrypt.
- A blocked request returns **429** with the error code `ECB429`, added to the `AppError`
  map in `packages/common`.

## Consequences

- Guessing is limited to 5 attempts a minute per address, and a correct password is blocked
  too once the limit is hit — so the limiter never confirms a lucky guess.
- Counting happens **in memory, per process**. One API on one machine, which is all Phase 1
  has. Several instances would each keep their own count; the fix is the Redis storage
  adapter, and Redis is Phase 3 (CLAUDE.md §2).
- The limit is per IP, so an office behind one NAT address shares a budget. 5 a minute is
  generous for humans typing passwords; raise `AUTH_THROTTLE_LIMIT` if a real clinic ever
  trips it.
- Behind a reverse proxy the client IP must come from `X-Forwarded-For`, which needs
  `app.set('trust proxy', ...)`. Nothing is proxied locally, so it is not set.
- `auth.e2e-spec.ts` raises the limit for itself; `auth-throttle.e2e-spec.ts` lowers it to 3
  and asserts the 429. They are separate files because the counter is per process.
