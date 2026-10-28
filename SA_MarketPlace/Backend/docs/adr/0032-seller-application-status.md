# ADR 0032 — Seller application status: tracked dates, a persisted acknowledgement, resubmission

## Context
After signing up, a seller sees one of three screens — under review, not approved, approved
— and the designs show things `supplier_profile` could not answer: "Submitted 25 Jul"
(which must change after a resubmission), "Reviewed 24 Jul" on a rejection (only approval
had a date, `approved_at`), and an approval notice that should appear once, not on every
sign-in. A rejected seller can also reopen the registration form with their details filled
in and send it back for review.

## Decision
- **Three new `supplier_profile` columns**: `submitted_at` (set at registration and again
  on resubmission — `created_at` never changes), `reviewed_at` (set when an admin approves
  or rejects, null while pending) and `approval_acknowledged_at`. Existing rows were
  backfilled; `db:verify` now asserts `reviewed_at` is set exactly for decided suppliers
  and that only approved ones can have acknowledged.
- **The acknowledgement is stored on the profile, not remembered by the frontend**, so the
  approval notice shows once across every device and browser. It is set with an
  `approval_acknowledged_at IS NULL` condition, so repeating the call, or two devices
  racing, keeps the first time and is harmless.
- **`GET /application` returns a different shape per status**, discriminated by `status`,
  so each screen receives only the fields it shows (a rejected seller gets the reason; an
  approved one never does). Pending and rejected sellers can call it — it is how they see
  where they stand.
- **Resubmission goes back to `pending_review`, never to approved.** It clears the
  rejection reason, `reviewed_at` and the reviewing admin, resets `submitted_at`, and
  updates the seller's name and phone — all in one transaction. The profile update carries
  `status = 'rejected'` in its condition, so a double submit, or a submit racing an admin
  decision, cannot both win; the loser gets a 409.
- **Resubmission excludes `email` and `password`**, like the profile edit (ADR 0028).
  Changing a sign-in email needs the re-verification flow CLAUDE.md §9.7 leaves open, and a
  password change has its own endpoint (ADR 0030). The email is shown read-only.
- **The support contact is configuration**, `SUPPORT_EMAIL` and `SUPPORT_PHONE`, returned
  inside the rejected view rather than from its own endpoint. The phone has no default: a
  made-up hotline number is worse than none, so blank hides the line.

## Consequences
- Nothing sets `reviewed_at` or `approved_by_user_id` yet: that belongs to the admin approve
  and reject actions, which don't exist. Until they do, status changes only come from
  seeding or direct SQL.
- A seller learns of a decision only by calling `GET /application` again — there is no
  push, and tokens last 15 minutes. Acceptable for Phase 1; a notification belongs with the
  Phase 3 notifications centre.
- Unapproved sellers are not yet blocked from other seller routes (catalogue, orders). That
  check should be added with the first of those modules, not retrofitted here.
- Rejected sellers cannot change their sign-in email while resubmitting, even if the email
  was a typo.
