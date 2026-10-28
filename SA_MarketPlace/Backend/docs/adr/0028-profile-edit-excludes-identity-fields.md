# ADR 0028 — Profile edit excludes email, password and organisation

## Context
`PATCH /auth/profile` lets a buyer edit their own My Profile fields. The obvious,
lazy shape is "accept a partial `User`, update whatever is present" — but three of
`User`'s editable-looking columns are not safe to fold into a generic self-service edit:

- **Email** is the sign-in identity. CLAUDE.md's own open question #7 already flags that
  changing it should trigger re-verification of the new address, and no such flow (or
  any email-sending infrastructure) exists yet. Accepting an email change today would
  silently repoint an account's identity with no proof the new address belongs to the
  person making the request.
- **Password** must never change without the caller proving they know the *current*
  one, even though they are already authenticated. A JWT is a bearer credential — if
  someone else gets hold of a valid token (a shared device, an XSS bug, a leaked log),
  a generic field PATCH would let them silently lock the real owner out permanently by
  changing the password. Real password changes need their own endpoint, re-verified.
- **Organisation** is shared state — `Order`, `Inventory` and other users all hang off
  `organisation_id`. Reassigning it from a profile-edit screen would move a buyer out of
  data other people on that organisation depend on, and CLAUDE.md §9.4 already flags
  organisation-as-free-text as unresolved pending dedup. Changing org membership is a
  bigger, separate feature, not a field on this form.

## Decision
`UpdateProfileDto` declares only `firstName`, `lastName` and `phone`, each optional —
true PATCH semantics, whichever fields are sent are the only ones that change. The
global validation pipe's whitelist (ADR 0013) rejects any other field with 400 rather
than silently dropping it, the same behaviour `register` already relies on.

`UsersService.updateProfile` (the shared primitive in `packages/auth`) takes a typed
`UpdatableProfileFields` — deliberately narrower than `Partial<User>` — so the
restriction holds at the type level, not only in the DTO. A future caller cannot widen
it by accident; adding a field to what can be self-service-edited means deliberately
widening this interface, not just adding a decorator to a DTO.

## Consequences
- Changing a sign-in email, a password, or organisation membership each need their own,
  separately-designed and separately-guarded endpoint later — this ADR does not build
  them, it just keeps this one from accidentally becoming all three.
- `PATCH /auth/profile` and `GET /auth/profile` share one response shape (`MyProfile`):
  the PATCH returns the same fresh view the GET does, so the frontend has one shape to
  render regardless of which call produced it.
- The same `UpdatableProfileFields` primitive is available to a future seller or admin
  "edit profile," should one need the identical restriction.
