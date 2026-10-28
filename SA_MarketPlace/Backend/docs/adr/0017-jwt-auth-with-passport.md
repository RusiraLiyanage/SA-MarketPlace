# ADR 0017 — JWT access tokens via Passport, shared in packages/auth

## Context
All four surfaces authenticate (CLAUDE.md §1), and three of them use email and password.
Putting the same strategies, guards and services in each app would be the same code three
times, and route guarding is a §7 requirement, so it must not drift between apps.

The reference repo solves this with a reverse-proxy `*-Guard` layer. This architecture has
none: every surface calls the API directly. A separate auth service would not remove the
need for token checking inside each app either — it would only move login.

## Decision

`packages/auth` holds the shared auth core: `LocalStrategy` (email and password),
`JwtStrategy` (Bearer token), `JwtAuthGuard`, `LocalAuthGuard`, `RolesGuard`, `@Roles()`,
`AuthService` and `UsersService`. Apps import `AuthCoreModule.register({ ... })`.

- Access token only: signed JWT, 15 minutes, sent as `Authorization: Bearer`.
- `JWT_SECRET` and `JWT_EXPIRES_IN` come from `.env` (ADR 0002), never from code.
- Passwords are hashed with **bcryptjs** — pure JS, no native build step, and it reads the
  same `$2b$` hashes the seed data already contains.
- Registration stays in each app: a buyer here, a `SupplierProfile` for sellers, an
  allowed-email-domain check for admins (it was an `AdminInvite` check until ADR 0038).

## Consequences

- A new app gets auth by importing one module and writing its own sign-up.
- Nest packages are peer dependencies of `packages/auth`, so there is exactly one copy of
  Nest in the process and DI metadata keeps working.
- **No refresh token.** After 15 minutes the user logs in again. Adding one later means a
  second strategy and stored refresh tokens; nothing here blocks that.
- `JwtStrategy.validate()` reads the user on every request, so this is not a stateless
  setup. That is the price of ADR 0018 and of blocking suspended accounts immediately.
- Guards run before pipes, so `POST auth/login` with a missing field returns 401 from
  Passport, not a 400 from the validation pipe. `LoginDto` documents the body in Swagger
  only.
