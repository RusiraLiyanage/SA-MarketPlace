# ADR 0031 — Seller registration: pending profile, split contact name, form fields without a home

## Context
The seller Signup screen is not shaped like the customer one. It collects business
details and one "Contact name", plus a "Role / title" and "Product categories" that
nothing in the data model stores, and it ends in an admin-review flow rather than
instant access. The data model, meanwhile, has separate `firstName` / `lastName`
columns, a `SupplierProfile` that defaults to `pending_review`, and no place for either
extra field. Login, forgot-password and reset-password needed no new design — the shared
`AuthService` already serves them (ADR 0017, 0019, 0029).

## Decision
- **One transaction creates the `User`, the `seller` role and a `SupplierProfile`**,
  the same shape customer registration uses for `Organisation`. The profile's status is
  left at its `pending_review` default: approval is the admin's switch (CLAUDE.md §6) and
  registering must never be able to set it.
- **A token is returned immediately**, as customer registration does, so the frontend
  can show "under review" straight away. **Pending and rejected sellers can sign in**;
  which screen they land on is decided from their supplier status, not by refusing login.
- **"Contact name" is split on the last space**: the last word is the last name,
  everything before it the first name. A one-word name is rejected by the DTO, because
  `User.lastName` cannot be empty and guessing a value would store bad data.
- **"Role / title" and "Product categories" are not accepted.** Neither has a column or
  table, and a supplier-to-category link is a feature the data model never defined.
  (Categories are since derived from the supplier's products, ADR 0040; they are still not
  collected here.)
  The DTO rejects them as unknown fields rather than silently discarding what the user
  typed.
- **The password rule is the backend's**, shared with every other app, even though the
  design's hint text is weaker. There is no `confirmPassword` field; matching the two
  fields is a frontend check (ADR 0030).
- **`abn` is checksum-validated** with a new `@IsAbn()` in `packages/common`, not just
  matched against 11 digits. It is the same algorithm `scripts/verify-schema.sql` already
  applies to seeded data.
- **`termsAcceptedAt` stays null for sellers.** The checkbox ("details are accurate and I
  am authorised") is a different statement from accepting terms, so it does not reuse
  that column. The DTO still requires it to be `true`.

## Consequences
- The name split is wrong for people whose surname has several words ("de la Cruz" becomes
  last name "Cruz"). Accepted for Phase 1; the fix is a second name field on the form,
  not smarter guessing.
- Two form fields collect nothing today. The frontend must not send them, or add them to
  the DTO when they get a home.
- There is no record of the authorisation confirmation beyond the request itself. If an
  audit trail of it is wanted, it needs its own column.
- Nothing stops two sellers registering the same ABN: `supplier_profile.abn` has no unique
  constraint. That is a business-rule decision for admin review, not settled here.
