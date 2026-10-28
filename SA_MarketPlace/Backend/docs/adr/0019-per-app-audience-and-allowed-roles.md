# ADR 0019 — Each app has its own token audience and allowed roles

## Context
One account, many roles (CLAUDE.md §4.1), and all apps share one database and one
`JWT_SECRET` from one `.env`. A token signed by the customer API therefore verifies
perfectly in the admin API. `RolesGuard` would still refuse the request, but the token
itself would be accepted, and a route someone forgot to guard would be open.

Logging in is also surface-specific: a seller signing in on the buyer storefront is a
mistake, not a permission question, and deserves a clear answer rather than a 403 later on
some unrelated route.

## Decision

`AuthCoreModule.register()` takes `audience` and `allowedRoles`:

| App | audience | allowedRoles |
|---|---|---|
| customer-facing | `customer` | `buyer` |
| supplier-api | `supplier` | `seller` |
| admin-api | `admin` | `admin` |

`audience` is signed into every token as `aud` and verified by `JwtStrategy`.
`AuthService.validateUser()` refuses a login by anyone holding none of `allowedRoles`.

## Consequences

- A token only works on the surface that issued it, whatever the secret. A user who is both
  a buyer and a seller logs in separately on each, which is correct: they are two products.
- Wrong-surface logins fail at login with "This account cannot sign in here", not later.
- `allowedRoles` is about which door you may enter, `@Roles()` about which room. Both are
  needed: `allowedRoles` cannot express per-route rules.
- Adding a role to a surface is a one-line change in that app's `AuthModule`.
- Roles are copied into the token at login, so a role granted afterwards applies at the
  user's next login — at most 15 minutes later.
