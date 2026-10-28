# ADR 0023 — Checkout re-validates the cart and reserves stock before charging

## Context
A cart can go stale between the buyer loading it and clicking "Place order": a product's
listing can be hidden, a supplier can be unapproved, or stock can drop below what the cart
shows. `GET cart` already flags this (`unavailableReason` per line, CLAUDE.md §4.2 shows
live prices), but checkout cannot simply trust what the cart last displayed — that state is
already out of date by the time the request arrives.

Money is also involved: a real gateway integration later must not charge a card for an
order that then turns out to be impossible to fulfil.

## Decision

`CheckoutService.placeOrder` runs the whole flow in one transaction, in this order:

1. Load the cart lines fresh, with the cart row locked (`loadCartLines`) — the same pattern
   as `CartService.withCartLock`, so a double-click on "Place order" queues up rather than
   placing the order twice.
2. Re-check every line against the same visibility rule the catalogue and cart already use
   (`isProductOrderable`, `packages`-shared, not a third copy — see the products module) and
   against current stock (`assertOrderable`).
3. **Reserve stock before charging** (`reserveStock`, an atomic
   `UPDATE ... WHERE quantity >= n` per line, sorted by product id to avoid lock-ordering
   deadlocks between simultaneous checkouts).
4. Only then call `PaymentService.charge()`, once, for the grand total.
5. Create the order/delivery/payment rows per supplier, empty the cart, and return.

If any step fails, the transaction rolls back — no order, no reduced stock, no cart
emptied — except for the order-number sequence, which is deliberately excluded from this
guarantee (ADR 0022).

## Consequences

- A sold-out line is caught before any charge is attempted, mocked or real.
- Two buyers racing for the last units of a product: exactly one succeeds, the other gets
  `INSUFFICIENT_STOCK` with no partial state left behind. Verified directly against real
  concurrent transactions, not just reasoned about.
- The cost is one extra pass over the cart's visibility rule at checkout time, beyond what
  `GET cart` already does. This is intentional — `GET cart`'s flags are informational, not
  authoritative, since more time has usually passed by the time checkout runs.
- `assertOrderable` throws once, naming every failing line, so the buyer is not sent back a
  cart error one line at a time.
