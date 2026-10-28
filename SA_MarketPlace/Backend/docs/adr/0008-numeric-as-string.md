# ADR 0008 — Money stays a string, never a float

## Context
TypeORM maps `numeric(10,2)` to JavaScript `string`, not `number`.

## Decision

Keep it. `price`, `subtotal`, `gstTotal`, `total`, `unitPriceAtPurchase` and `lineTotal`
are typed `string`. No numeric transformer.

## Consequences

- A JS number cannot hold decimal money exactly, which is why DATABASE.md §5 bans floats
  for these columns. A transformer to `number` would reintroduce exactly that.
- Never `parseFloat` these for arithmetic. Use a decimal library or compute in SQL.
- Formatting happens at the API boundary.
