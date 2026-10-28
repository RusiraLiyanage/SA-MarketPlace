# ADR 0042 — Admin orders oversight and the CSV export

## Context
Admins need a read-only view of every order on the platform: a table (payment and fulfilment filters,
search, paging), a detail screen, the invoice, and an "Export CSV" of the table. The fulfilment is the
supplier's job, so nothing here changes an order. The export is the first file download that is not a
single stored PDF, so it sets the pattern for later exports.

## Decision
- **Routes**, admin-only (the role is checked as well as the audience): `GET /orders`,
  `GET /orders/export`, `GET /orders/:orderNumber` and `GET /orders/:orderNumber/invoice`. The export is
  declared before `:orderNumber`, or "export" would be read as an order number. The order number is
  checked against `ORD-YYYY-NNNNN` before any query.
- **Not scoped.** An admin sees every supplier's and every buyer's orders; the role guard is the boundary.
- **The table.** Default newest first, with an allow-list sort (`placed_at`, `total`, `order_number`) and
  `order.id` as tie-break so pages never overlap. Search matches the order number, the customer's
  organisation name and the buyer's full name (not the supplier), with LIKE wildcards escaped. A
  customer with no organisation is shown by the buyer's name. Payment is joined, not a relation, so an
  order with no payment row still appears, with `payment: null`.
- **Fulfilment vocabulary.** `received`, `picking`, `dispatched`, `delivered`, `cancelled`, defined once in
  `packages/common` (`order-fulfilment.ts`) with its mapping to the backend `OrderStatus`. The seller app's
  buckets are built from the same mapping, so "new" there is "received" here and the two cannot drift.
- **The detail** is read-only: items ordered by name then id, the frozen totals, the delivery address and,
  once dispatched or delivered, the carrier and tracking number. A carrier assigned before dispatch is
  hidden. `canDownloadInvoice` is true only for dispatched or delivered orders, the rule the seller and
  buyer apps follow.
- **The invoice** is the shared `InvoiceService` PDF: one stored document for every audience, issued the
  first time anyone opens it, 409 before dispatch.
- **The export is a stream, not a file.** The same filters and sort as the table, no paging
  (`page` and `limit` are rejected). The rows are read 500 at a time as the client takes them and piped to
  the response: nothing is written to disk and memory stays flat however large the file. If the client
  leaves, the stream is destroyed.
- **A stable snapshot.** The export only includes orders placed before it began. Batches are offset pages,
  and a new order arriving mid-export would shift them; a placed-at cut-off keeps every row once.
- **A cap, checked first.** A count runs before streaming; over `ORDER_EXPORT_MAX_ROWS` (default 10,000)
  the request is a JSON 400 telling the admin to narrow the filters. Once bytes are streaming an error
  status can no longer be sent, so the failure has to come before them. The table is not capped.
- **The file is a safe CSV** (`packages/common/src/csv.ts`, reusable): RFC 4180 quoting with CRLF
  endings; a UTF-8 byte order mark so Excel keeps accents; dates as ISO 8601 UTC (ADR 0033); money as the
  exact strings (ADR 0008). Cells that start with `=`, `+`, `-`, `@`, tab or carriage return get a leading
  apostrophe, because a customer's organisation name is typed by a stranger and a spreadsheet would run
  it as a formula (OWASP "CSV injection").
- **Headers.** `text/csv; charset=utf-8`, `attachment` with `orders-<UTC date>.csv`, and
  `Cache-Control: no-store`, since the file holds customer data.
- **An audit line.** The log records the admin's id and the row count, never filters or names.

## Consequences
- **The date in the filename is UTC.** Late evening in Sydney it can be a day behind the local date.
- **The apostrophe is part of the cell** when a file is read by something other than a spreadsheet.
  A real customer is not renamed by it; only text that begins with one of those characters is changed.
- **A long export holds a connection per batch, not for the whole download,** but a very slow client still
  keeps the request open. The cap bounds the work; a download queue is out of scope.
- **Offset batches cost more as the file grows** (each batch skips the earlier ones). Fine at 10,000 rows;
  a larger cap would want keyset paging.
- **Collection Manager and marketplace orders are one list.** The design says "every marketplace and
  Collection Manager order", but `order` has no channel column, so they cannot be told apart or filtered.
- **An order with no payment row shows no payment.** Checkout always creates one, so this is a guard, not
  an expected state.
- **No history of who exported what beyond the log line.** An audit table is Phase 3.
