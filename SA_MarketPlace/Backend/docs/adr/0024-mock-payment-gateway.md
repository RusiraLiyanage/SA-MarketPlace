# ADR 0024 — Mock payment gateway: fixed test numbers, no card data stored

## Context
The brief (§4) requires checkout to "look and behave realistically — collect the order,
confirm it, and mark it paid" while "no real payment gateway is connected and no real money
moves", explicitly to avoid handling anyone's real card data. CLAUDE.md §4.6 adds the PCI
rule directly: never store `card_no`, `cvc`, or `expiry`, even for a mocked checkout.

## Decision

`PaymentService` is a small, self-contained mock, modelled on how real sandboxes (Stripe's
own test mode) work — the outcome is decided by the card number alone, nothing is called
over the network:

- `4242 4242 4242 4242` → always approved.
- `4000 0000 0000 0002` → always declined (`PAYMENT_DECLINED`, HTTP 402).
- Any other number is checked for plausibility only: stripped of spaces, 13–19 digits,
  passes the Luhn checksum, and has an expiry that has not passed — then approved.
- The card's brand is guessed from its leading digit (`4` Visa, `5` Mastercard, `3` Amex),
  for display only.

**Only `cardLast4` and `cardBrand` are ever returned or stored** (`PaymentResult` /
`payment` table). The card number, CVC, and expiry are read once, inside `charge()`, and
never appear in any return value, log line, or column — there is no field for them to leak
into. `invoice_on_account` skips card handling entirely: `status: pending`, every card
field `null`.

`amountCents` is accepted by `charge()` but unused by the mock; it exists so the interface
already matches what a real gateway integration (Phase 3, CLAUDE.md §3) would need.

## Consequences

- The checkout flow behaves realistically for a demo or a test — an invalid or declined
  card produces a real, visible failure — without ever contacting an external service or
  needing network access to run locally.
- A real gateway replaces exactly one class (`PaymentService`) with no change to
  `CheckoutService`, `PlaceOrderDto`, or the database.
- The Luhn check only catches accidental typos; it proves nothing about whether a card is
  real, active, or not stolen. That is expected — this is a mock, not a validator.
- **Electronic invoices (PDF, per completed order) are required by brief §4 and are not yet
  built.** This is a deliberate, recorded deferral, not an oversight — checkout produces
  `order`, `order_item`, `delivery` and `payment` rows correctly, but no `invoice` row yet.
  It is the next piece of work on this feature.
