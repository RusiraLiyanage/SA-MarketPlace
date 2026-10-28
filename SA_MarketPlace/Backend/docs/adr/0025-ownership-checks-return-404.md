# ADR 0025 — Ownership checks return 404, not 403

## Context
`GET /orders/:orderNumber` must make sure a buyer can only ever see their own order.
Order numbers are a small, sequential, guessable space (`ORD-<year>-<5 digits>`, ADR
0022) — if a wrong-owner request returned 403 Forbidden while a genuinely missing one
returned 404, a script could tell the two apart and enumerate which order numbers exist
at all, without ever seeing their contents. `ProductsService.getProduct` already made this
call for hidden/retired products, expressed only as a code comment ("hidden and missing
products get the same 404, so hidden ones stay invisible"); `AppError.ECB404`'s own doc
comment generalises it: "the entity does not exist (or is not visible to this caller)."
This ADR makes it an explicit, repeatable rule now that a second endpoint depends on it.

## Decision
Every endpoint scoped to "the caller's own X" filters ownership **inside the same query**
that finds the row — `WHERE order_number = :orderNumber AND user_id = :userId`, never a
plain lookup followed by a separate ownership check. A row that exists but belongs to
someone else, and a row that does not exist at all, produce the identical response: same
code (`ECB404`), same message, same shape. `OrdersService.getOrderDetail` follows this
exactly as `ProductsService.getProduct` does.

## Consequences
- No side channel: the response alone never reveals whether "not yours" or "doesn't
  exist" is the actual reason.
- Any future ownership-scoped endpoint (a seller's own orders, a buyer's own cart, an
  admin's own profile) should default to this pattern rather than re-deriving it.
- A genuine 403 is still correct where the caller is *allowed* to know a thing exists but
  isn't allowed to act on it (e.g. a disabled action on a visible record) — that is a
  different case from ownership scoping and should not be conflated with it.
