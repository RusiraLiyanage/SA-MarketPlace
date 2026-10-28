# ADR 0021 — The catalogue requires sign-in

## Context
CLAUDE.md §1 describes the customer marketplace as a "public storefront" for "any buyer".
Taken literally, the product list, filters and detail page would be open to anyone.

This is a workplace drug-and-alcohol-testing supplies marketplace. The decision was taken
that the landing page is for signed-in buyers: a visitor registers or logs in first, then
browses.

## Decision

`ProductsController` carries the same guards as every other private route, on the **class**
so a new product route cannot be added unprotected:

- `@UseGuards(JwtAuthGuard, RolesGuard)` with `@Roles(UserRoleType.buyer)`
- `@ApiBearerAuth()`, so Swagger sends the token

`GET products/categories`, `GET products` and `GET products/:productId` all return 401 without
a valid customer token.

## Consequences

- The frontend must route visitors to Login or Register before the catalogue. There is no
  anonymous browsing.
- The published-and-approved visibility rule still applies to signed-in buyers; sign-in does
  not reveal drafts or unapproved sellers.
- When CM ordering starts, `collection_manager` must be added here and to the app's
  `allowedRoles`, or CM users cannot see the catalogue.
- Reversing it is removing the three decorators; nothing else depends on the guard.
- Departs from the wording of CLAUDE.md §1 — confirm against the full brief (§10).
