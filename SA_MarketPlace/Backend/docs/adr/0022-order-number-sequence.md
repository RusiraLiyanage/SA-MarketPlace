# ADR 0022 — Order numbers come from a Postgres sequence, not count()+1

## Context
Every order needs a unique, human-readable number (`ORD-2026-00129`). The obvious approach
— count the existing orders and add one — is what the reference repo's own number
generator does (`Collect-Assist-API/src/services/db.service.ts`). It also breaks under
concurrency: two checkouts running at the same moment both count the same number of
existing orders and are handed the same next number, and the second insert then fails on
the unique constraint.

## Decision

A plain Postgres sequence, `order_number_seq` (migration `CreateOrderNumberSequence`),
started at 129 so it continues from the seed's last order, `ORD-2026-00128`.
`CheckoutService.nextOrderNumber()` calls `SELECT nextval('order_number_seq')` and formats
the result as `ORD-<year>-<padded to 5>`.

## Consequences

- Two simultaneous checkouts can never be handed the same number — `nextval()` is atomic
  and each call returns a distinct value, with no read-then-write gap to race in.
- `nextval()` is **not undone by a transaction rollback**. A declined payment or a checkout
  that fails after allocating a number still consumes it, leaving a gap in the sequence.
  This is accepted: `order_number` is not required to be gapless. Contrast `invoice_number`
  (§4.4), which is deliberately gapless via its own separate sequence, because an invoice
  only exists once an order is genuinely completed.
- The year in the formatted number is read from the clock at call time, not carried as a
  parameter. In practice this is always the same as the order's `placed_at` year, since
  both are read within the same request.
