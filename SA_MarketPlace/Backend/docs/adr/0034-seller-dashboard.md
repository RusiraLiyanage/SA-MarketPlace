# ADR 0034 — Seller dashboard: approval guard, order buckets, what the counts mean

## Context
The seller dashboard is the first seller screen that does real work, and the designs leave
several words undefined: what is a "new" order, what "items" counts, what "needing
attention" means, and who may see any of it. ADR 0032 promised unapproved sellers would be
blocked from everything except their own application screens once the first such module
existed. This is it.

## Decision
- **`ApprovedSupplierGuard` gates every dashboard route** (and is the gate for future seller
  modules). Pending, rejected and profile-less sellers get 403 `ECB403`. It also resolves the
  seller's profile id from the verified token and puts it on the request, so every query is
  scoped by `req.supplier.profileId` — never by anything the caller sends — and one seller
  cannot see another's orders or listings (CLAUDE.md §7). The cost is one profile lookup per
  request.
- **The seller's vocabulary maps onto the single backend order status in one place**
  (`dashboard.typing.ts`), answering CLAUDE.md open question #2 for the seller side:
  *new orders* are `placed` and `confirmed`; *awaiting dispatch* adds `picking`;
  dispatched, delivered and cancelled orders are no longer the seller's to act on. The
  Orders module must reuse these, not redefine them.
- **"Items" is units, not order lines.** The design's "5 items" is an order with two lines of
  2 and 3. Summed with one grouped query per page, never one per row.
- **"Dispatched today" counts orders**, by when they were dispatched (not placed or
  delivered), over the seller's own calendar day — see ADR 0033.
- **"Needing attention" is published listings at or below their low-stock threshold**
  (low stock and out of stock), also the Catalogue badge. Draft and retired listings never
  count, however empty. This is the same rule the customer app derives `stockStatus` from,
  restated as SQL.
- **The dispatch queue defaults to oldest first.** Every order of one seller shares the
  same SLA, so the oldest is the one closest to breaching it. It pages like the customer
  app's My Orders (same `PagingReqDto`, same meta, sort field allow-listed).
- **The SLA clock starts at `placed_at` and runs in plain hours** of the seller's
  `dispatch_sla_hours`. `slaHoursLeft` is rounded up and negative once overdue; the
  frontend decides what colour that is.

## Consequences
- The low-stock rule now exists twice: in the customer app's `stockStatus` and in the
  dashboard's SQL. If the rule changes, both must. It should move to one shared place when
  Catalogue Management needs it a third time.
- The SLA ignores weekends and business hours, so an order placed Friday evening shows as
  overdue by Sunday. If the business means business hours, that is a larger change than a
  number on the profile.
- There is no notifications panel: the updated design dropped it, and the Phase 3
  notifications centre is separate.
- `delivery.dispatched_at` has no index. The query filters to one seller's orders first, so
  this is fine at current size; add one if it grows.
- The seeded orders are weeks old, so every seeded queue row shows a large negative SLA. The
  tests build their own orders, with SQL, so these numbers are exact.
