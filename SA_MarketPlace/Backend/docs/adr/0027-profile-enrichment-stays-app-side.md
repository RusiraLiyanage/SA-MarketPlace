# ADR 0027 — Profile enrichment stays app-side; packages/auth stays generic

## Context
The My Profile screen needs two fields beyond what `AuthService.getProfile` already
returns (email, name, phone, roles): `memberSince` (the account's `createdAt`) and
`ordersPlaced` (a count of `Order` rows). Both live in `packages/auth`, which is shared
by every app — customer marketplace, seller portal, admin — none of which share a
concept of "orders placed" the way a buyer does. A seller has orders *received*; an
admin has none at all.

## Decision
`AuthService.getProfile` in `packages/auth` is left untouched — still just the generic,
cross-app identity fields. The enrichment lives entirely in
`apps/customer-facing/src/modules/auth/services/profile.service.ts`, a new
`ProfileService` that composes `UsersService` (shared) with two marketplace-specific
reads (`Organisation`, `Order`) that only this app registers. `AuthController.getProfile`
(also app-owned) now calls `ProfileService` instead of `AuthService.getProfile` directly
— one route, `GET /auth/profile`, not two competing ones.

This is the same split already used for PDF invoices (ADR-adjacent): a shared package
stays domain-agnostic, and each app builds its own richer view on top rather than the
shared package growing app-specific branches.

Two smaller calls made inside `ProfileService`:
- **`ordersPlaced` counts every order the buyer has ever placed, cancelled or not.**
  "Placed" describes the historical event of checkout succeeding, not the order's
  current status — a cancelled order still genuinely happened.
- **No password field, hashed or otherwise, is ever part of the response.** There is no
  way to recover a real password from a bcrypt hash, and the hash itself must never
  leave the backend. The design's "password in dots" is a static frontend placeholder
  (a password input rendered with a fixed masked value), not data this endpoint supplies.

## Consequences
- `packages/auth` never needs to know what an "order" is, keeping it usable by
  supplier-api and admin-api without modification once they exist.
- Extending `GET /auth/profile` in place means every existing caller and test keeps
  working unchanged — the response only gained fields, an object superset of what was
  there before (`auth.e2e-spec.ts`'s `toMatchObject` checks already tolerate this).
- A future seller "My Profile" would follow the identical pattern: its own
  `ProfileService` in `apps/supplier-api`, composing the same shared `AuthService`, never
  a shared "profile" concept forced to serve two different shapes.
