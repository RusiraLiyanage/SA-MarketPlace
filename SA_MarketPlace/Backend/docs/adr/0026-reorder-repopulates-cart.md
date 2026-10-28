# ADR 0026 — Reorder repopulates the cart; it never creates an order directly

## Context
`POST /orders/:orderNumber/reorder` needs to let a buyer quickly buy a past order's
items again. The tempting shortcut is to copy the old order's lines straight into a new
`order`/`order_item` set, the same way `CheckoutService.placeOrder` does — but that would
either resurrect `unitPriceAtPurchase` (violating the price-freeze rule, §4.2: an old
order's prices are history, not something to charge again) or require re-deriving live
prices, live stock and live visibility in a second place, alongside `CartService` and
`CheckoutService`, which already do exactly that. Two implementations of "is this line
still orderable" is precisely the kind of divergence CLAUDE.md's core rule (§1) warns
against for the buyer surfaces generally.

## Decision
Reorder does not touch `order` or `order_item` at all. For each line on the original
order, `OrdersService.reorder` calls the existing `CartService.addItem` — unmodified,
with no new "reorder mode" — which already re-checks visibility, re-prices from the live
`Product` row, and enforces current stock. The buyer ends up with the items sitting in
their cart, exactly as if they had added them by hand, and goes through the same
checkout flow as any other purchase.

It is **best effort, not all-or-nothing**: each line is tried independently
(`reorderLine`), and a line that fails — `PRODUCT_NOT_FOUND` (retired, or its supplier no
longer approved) or `INSUFFICIENT_STOCK` — is skipped and reported with its exact
`BusinessException` message, while the remaining lines still go in. Quantities are never
silently capped to whatever stock remains; a line either gets its original quantity or is
skipped, since `addItem` itself has no "give me as much as you can" mode and Reorder does
not invent one. The response returns both the updated `CartView` and a per-line
`{ added, reason }`, so the caller can show something like "2 of 3 items added — Hair
Follicle Test Kit is no longer available" without a second round-trip.

Quantities are additive on top of whatever is already in the cart (`addItem`'s existing
behaviour) — reorder never clears or replaces the cart first.

## Consequences
- Reorder can never drift out of sync with what checkout actually allows, because it
  shares the one code path (`addItem`) rather than a parallel copy of its rules.
- The buyer always sees current prices before paying again, never the frozen historical
  ones — consistent with every other read of `Product.price` in the buyer surfaces.
- A large historical order calls `addItem` once per line, each taking its own cart lock
  in sequence (not parallel) — acceptable for a "reorder my usual" action's expected line
  count, and simpler than trying to batch a lock-per-product operation into one query.
- If a future requirement needs an "all or nothing" reorder (fail the whole thing if any
  line can't be re-added), that is a different, additive mode on top of this — not a
  reason to change the default here.
