# ADR 0037 — Seller business profile: what can be edited, the password rule, names that must fit

## Context
The Business Profile screen is the seller's own view of the business Sample Assist
verified, plus their contact, fulfilment settings and password. Following the customer app's
My Profile (ADR 0027, 0028, 0030) answers the structure, but the seller design differs in
ways that need deciding: it draws every business field as an input, shows "Verified
supplier", and carries fulfilment settings the dashboard and orders already depend on.

## Decision
- **Same structure as the customer app.** `GET` and `PATCH /auth/profile` share one response
  shape (`MyBusinessProfile`, in `auth.typing.ts`), and `POST /auth/change-password` lives
  beside them, with logout. The profile routes are **approved sellers only**; change password
  is open to any signed-in seller, including one still pending, because it is about the
  account, not the business.
- **Editable: business type, contact name, phone, dispatch SLA and default carrier.** Each is
  optional and only what is sent changes (no defaults, so nothing is reset by accident). A
  blank business type or default carrier clears it. An empty body is a no-op that writes
  nothing. The user's name and phone and the business's fields are saved in one transaction.
- **Not editable: business name, ABN and email** (and password, status, timezone), exactly as
  ADR 0028 keeps email and organisation out of the buyer's profile. An admin verified the
  name and ABN by hand, so letting a seller rewrite them would make the "Verified supplier"
  line meaningless; the email is the sign-in identity and changing it needs the
  re-verification that does not exist yet (CLAUDE.md §9.7). The validation pipe rejects them
  with 400 rather than ignoring them. The design draws them as inputs; the frontend shows them
  read-only. Invoices copy the name and ABN when issued (§4.4), so a future admin-approved
  rename would not rewrite them.
- **Change password follows ADR 0030, not a current-password check.** The design, like the
  customer one, shows the current password as dots with only the new password typed, so
  `change-password` takes only `newPassword`, authorised by the token. `GET /profile` returns
  `passwordLength` so the screen can draw dots of the real length, never the password or hash.
  A same-as-current password is still refused, other sessions are signed out, and a fresh
  token comes back for this one. It is rate limited, with the throttle running before the
  token check. `currentPassword` and `confirmPassword` are rejected as unknown fields.
- **The dispatch SLA is whole hours from 1 to 168.** It is the one editable field with an effect
  on other screens: the dashboard computes each open order's deadline as `placed_at` plus the
  seller's *current* SLA (ADR 0034), so changing it moves the deadline of orders already
  waiting, not only new ones. The default carrier only prefills the dispatch form, is free text,
  and is not checked against known carriers.
- **Role / title is not in the API.** It has no column, and ADR 0031 already left it out at
  registration. Product categories are returned, read-only, from the seller's products (ADR 0040).
- **Every limit matches its column.** A name that fits a validator but not the database is a 500.
  `defaultCarrier` is `varchar(100)` (it had been set to 120, which is the carrier-name limit), and
  a contact name is split into two `varchar(100)` columns, so the contact name is validated as a
  full name whose first and last parts are each at most 100 characters (`@IsContactName()`).
  This also fixes registration and resubmission, which had the same unchecked overflow.

## Consequences
- **Anyone holding a valid token can change the password without further proof**: the trade-off
  ADR 0030 accepted for the customer app, now also true for sellers. The fix, if wanted, is
  additive: put `currentPassword` back in the DTO and check it in the service.
- **A seller can change their own SLA to 168 hours** and so push their own deadlines out. Nothing
  in Phase 1 audits or limits it; an admin-set SLA, or a cap, would be a later decision.
- **The profile routes are unavailable to pending and rejected sellers.** They see their
  application through `/application` instead.
- **Changing business name or ABN needs an admin route** that does not exist, and probably the
  re-verification and ABN lookup scheduled for Phase 2.
- **The seeded password length was wrong** (13 for a 12-character password), so every seeded
  account would have shown 13 dots. It is fixed in `seed.sql`, and the profile e2e spec now
  checks the seeded login reports 12.
- **Database lengths are repeated in DTOs by hand.** The audit this ADR came from found the two
  mismatches above; nothing yet checks the rest automatically.
