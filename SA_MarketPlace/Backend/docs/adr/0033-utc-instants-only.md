# ADR 0033 — Every date-time is a UTC instant; no bare date columns

## Context
Almost every date-time column was already `timestamptz`, which Postgres stores as a UTC
instant. Two were not: `delivery.dispatched_on` and `delivery.estimated_delivery` were
plain `date` columns. A `date` has no timezone, so what it means depends on who wrote it —
the seller dashboard's "dispatched today" would count an order dispatched at 8am Monday in
Sydney under Sunday if the writer used UTC's calendar, and checkout was in fact writing
`estimatedAt.toISOString().slice(0, 10)`, a UTC date. Two writers on different calendars
would have made the dashboard wrong for roughly ten hours of every Sydney day.

## Decision
- **Every date-time column is `timestamptz`, a UTC instant.** The two `date` columns became
  `delivery.dispatched_at` and `delivery.estimated_delivery_at`, named like `placed_at` and
  `delivered_at`. Existing dates were read as Australian Eastern calendar days and became
  the start of that day as a UTC instant.
- **Stored times are compared as UTC instants, against a range.** "Dispatched today" is
  the calendar day in the **supplier's own timezone**, so a dispatch made today for them
  counts as today whatever its UTC date. The timezone is stored per supplier
  (`supplier_profile.timezone`, an IANA name, default `Australia/Sydney`; existing
  suppliers got the default) rather than read from a project-wide constant.
  Postgres turns that day into a half-open range of UTC
  instants `[local midnight, next local midnight)` from `now()` and the supplier's zone,
  and the column is compared against it as-is: the bounds never wrap the column, so an
  index can be used. The day is 23 or 25 hours long when daylight saving changes, which
  falls out of adding a calendar day to the local midnight. Showing an
  instant to a user formats it in `DEFAULT_TIMEZONE` (Australia/Sydney).
- **`db:verify` asserts it**: no `date`, `time` or `timestamp without time zone` column may
  exist in the public schema, so a bare date cannot creep back in.
- **The API fields were renamed with the columns** (`dispatchedAt`, `estimatedDeliveryAt`
  on the customer API's order and checkout responses) and now return ISO timestamps rather
  than `YYYY-MM-DD` strings. No frontend consumed them yet, so this was the cheapest time.

## Consequences
- Any other "today" or "this week" query must build its range the same way, from the
  supplier's timezone, not compare against UTC's calendar day, or a seller's morning would
  fall on the wrong side of it.
- Nothing yet lets a supplier change their timezone. When Business Profile does, the value
  must be validated as a real IANA name: an unknown name makes the dashboard throw.
- Registration does not ask for a timezone, so every new supplier starts on the default.
- Frontends must format these instants in Australian Eastern time themselves; a bare
  `2026-08-28` is no longer sent. Showing the raw UTC date would be a day out for part of
  every day.
- An "estimated delivery" is now an instant (placed time plus SLA plus transit), shown as a
  date. It reads as precise when it is not; it is only ever displayed at day level.
- The future dispatch action must write `dispatched_at` as a real instant (`new Date()`),
  never a truncated date.
- The backfill of the two columns assumed Sydney midnight, which is a convention for
  existing rows and not a recorded fact about when anything was dispatched.
