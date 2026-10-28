# ADR 0036 — Seller orders: dispatch, cancel, and one shared invoice

## Context
The seller's Orders area is where a marketplace order meets the real world: someone packs
it, hands it to a carrier, or admits they cannot. Each step changes money and stock, and two
people (the seller, and the buyer on the other app) can act on the same order at once. The
designs leave open what a cancellation reason is, what happens to stock and payment, who sets
the delivery times, and how the seller gets the same invoice the buyer does.

## Decision
- **Five routes under `/orders`**, behind `ApprovedSupplierGuard`: the table (`GET`), one
  order (`GET :orderNumber`), `POST :orderNumber/dispatch`, `POST :orderNumber/cancel` and
  `GET :orderNumber/invoice`. Every query is scoped by the seller from the token; another
  seller's order is a 404 identical to a missing one (ADR 0025). The order number is checked
  against its generated shape (`ORD-2026-00123`) before any query.
- **The seller's five statuses sit over the one backend status** (CLAUDE.md §9.2, seller
  side; shared with the dashboard, ADR 0034): *new* is `placed` and `confirmed`, then
  *picking*, *dispatched*, *delivered*, *cancelled*. The table filters by the seller's five;
  a backend name such as `placed` is refused.
- **Dispatch takes a carrier and a tracking number, nothing else.** The times are the
  server's: `dispatchedAt` is now (UTC, ADR 0033) and `estimatedDeliveryAt` is that plus
  `TRANSIT_DAYS` (3), the constant checkout uses, so the estimate the buyer saw and the one
  recorded agree. Sending either time is refused. A carrier is matched by name ignoring case
  and stray spaces, and created if it is new; the seller's default carrier is returned only to
  prefill the form.
- **Cancel ("cannot fulfil") has four reasons**: out of stock, cannot meet the dispatch SLA,
  pricing error, other (CLAUDE.md §9.6). The text stored on the order, and shown to the buyer,
  is the readable label plus optional notes (`Pricing error: listed at $1`). Notes are
  required for *other* and, if sent, may not be blank. A cancelled order is final.
- **Both actions run in one transaction and are guarded by the UPDATE itself.** The status
  change is `UPDATE … WHERE status IN (new, picking)` and a count other than 1 is a 409, so
  two dispatches, two cancels, or a dispatch racing a cancel can never both win. The earlier
  status check in code is only a quick way out; the guarded update is the real check. Dispatch
  and cancel are allowed from *new* or *picking* only; anything else is 409
  (`Cannot fulfil this order` / `This order can no longer be cancelled`).
- **Cancel undoes what checkout did to the seller's side, and tells the buyer.** In the same
  transaction it gives each line's units back to `product.quantity` (the reverse of checkout's
  reservation; the buyer's shelf `inventory` is untouched, §4.5), and marks a **paid** payment
  `refunded` (a new `payment_status` value; pending and failed payments are left alone because
  nothing was charged). After the commit it emails the buyer the reason through the mock mail
  service. No money moves anywhere: a refund is a status.
- **The detail hides a carrier or tracking number until the order has gone out.** One may be
  on file earlier, but showing it before dispatch would suggest the parcel has left.
- **The invoice is one document for every audience.** `InvoiceService` lives in
  `packages/common` and both apps call it. The first download by anyone generates the PDF,
  stores it under `storage/invoices/INV-YYYY-NNNNN.pdf` and writes the `invoice` row, with
  seller and buyer details copied onto it so a later rename never rewrites an issued invoice
  (§4.4); every later download, from either side, serves the stored file. Only dispatched or
  delivered orders have one (`db:verify` enforces it too).
- **Invoice generation is serialised per order.** The service takes a Postgres advisory lock
  on the order inside a transaction before it checks for an existing invoice. Without it,
  two simultaneous first downloads (a double-click is enough) both generated one: the loser hit
  the unique constraint, returned a 500, and left an orphan PDF and a skipped invoice number.
- **Order lines are listed by product name, then id**, in the seller's pick list, the invoice and
  the customer app's order detail, so all three agree. `id` is a random UUID, so sorting by it
  gave an arbitrary order. There is no line-position column.

## Consequences
- **Picking is a screen step, not a stored status.** A new order stays `new` until the seller
  dispatches it; the order screen shows the *Picking & Packing* step while it is new, and
  ticking the pick list is the frontend's and is not saved. So nothing sets `picking`, and an
  order goes from *new* straight to *dispatched*. The status still exists in the vocabulary
  because the seed data and the dispatch queue count it, but the table's *Picking* filter will
  return nothing for real orders; the frontend can hide that chip. Saving picks (or partial
  picking) would need an endpoint and a table.
- **Nothing sets `delivered`, and receiving does not add to the buyer's `inventory`** (§4.5,
  open issue). Dispatched orders stay dispatched until another actor is built (admin, or a
  buyer "received" action).
- **The estimate is a flat three days**, with no business days, carrier or timezone. It is a
  rough figure, not a promise.
- **Invoice numbers can still skip.** The sequence is not transactional (ADR 0022): a render or
  write failure after the number is taken leaves a gap. The race above no longer causes one.
  A tax-invoice rule that forbids gaps would need numbers assigned at commit.
- **A first invoice download is slow** (about half a second): it starts a headless browser if
  there is not one yet, and holds a database connection while it renders.
- **Email is a log line.** A real provider replaces `MailService`'s body only.
- Two of the checks in the code are deliberately redundant with the guarded UPDATE (the early
  "is it still new or picking" tests), so removing them changes no outcome; they save a carrier
  lookup and a transaction on the obvious failure.
