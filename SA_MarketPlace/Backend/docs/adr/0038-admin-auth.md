# ADR 0038 — Admin auth: sign-up limited to allowed email domains, no invitations

## Context
The admin app needs sign-in for Sample Assist staff. The first design gated registration
behind an invitation code (single use, 7 days, made by an existing admin). That feature was
dropped: nobody builds the invite screen, and creating invites by hand in the database was only
ever a stopgap. Removing it removes the one control on who can create an account that will
approve suppliers and see every order, so something has to take its place.

## Decision
- **No invitations.** The `AdminInvite` entity, the `admin_invite` table (the reversible
  `DropAdminInvite` migration), its seed rows and its `db:verify` check are removed. The schema
  is now 17 tables and 19 migrations. The register form has no invitation code.
- **Admin sign-up is limited to allowed email domains.** The part of the email after the last `@`
  must exactly equal (ignoring case) a domain in `ADMIN_EMAIL_DOMAINS`, a comma-separated list
  that defaults to `sampleassist.com.au`. It is an exact match, never "ends with", so
  `evil-sampleassist.com.au`, `sampleassist.com.au.evil.test` and `mail.sampleassist.com.au` are
  refused. The setting is read on every request, and an empty value allows nobody.
- **An address outside the domain gets one answer.** It is a 400 "Admin accounts are only
  available to Sample Assist staff email addresses" whether or not that address already has an
  account anywhere, so the endpoint cannot be used to find out who has a seller or buyer account.
  Only inside the domain does a taken address get 409, as in the other sign-ups.
- **Two sign-ups for one email cannot both win.** With no invite to serialise them, the
  database's unique constraint on `user.email` decides, and the loser gets the same 409 rather than
  a server error.
- **Everything else follows the seller sign-up.** One "Full name" is split on the last space (each
  part at most 100 characters). The password follows the backend rule, there is no
  `confirmPassword`, and registering returns a token. The "I agree" tick, `acceptTerms`, is required
  even though the design has no checkbox; it is stored as `terms_accepted_at`. A new admin is active
  at once with the `admin` role, no phone and no organisation.
- **Sign-in, forgot, reset and logout are the shared ones.** Only the `admin` role may sign in
  (a seller or buyer gets 403), tokens carry the `admin` audience so they work on this app only (the
  spec forges tokens for other audiences to prove it), and register, login, forgot and reset are rate
  limited per IP.

## Consequences
- **This is a speed bump, not a lock.** Nothing checks that the person owns the mailbox, so anyone
  can type `anything@sampleassist.com.au` and get an admin account. That is acceptable only while the
  project is local with fake data (CLAUDE.md §7). It must be replaced before any real use, for example
  by a new admin waiting for an existing admin's approval, or by a verified email. The alternative of
  approval was offered and not chosen.
- **There is no way to create admins other than registering, and none to remove or deactivate one.**
- **Inside the domain, the 409 confirms which staff addresses have an account.** The other sign-ups
  behave the same way.
- **The reset link goes to the admin frontend's own page** (`ADMIN_RESET_URL`, with `?token=` added), the
  same per-app setting the buyer and seller apps have (`CUSTOMER_RESET_URL`, `SUPPLIER_RESET_URL`). The
  mock mail only logs it. The shared `PASSWORD_RESET_URL` placeholder is gone.
- **"Keep me signed in" has no backend**, as in the other apps: tokens last 15 minutes.
- **The register design still carries invitation wording** in its subtitle, its email hint and its
  footer; the frontend should drop it.
- **The seed no longer ships an invitation code.** To try the flow, register any address at an allowed
  domain.
