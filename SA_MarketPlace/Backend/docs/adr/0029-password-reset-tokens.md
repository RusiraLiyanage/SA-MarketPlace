# ADR 0029 — Password reset: opaque hashed tokens, no enumeration, session-wide invalidation

## Context
A forgot/reset-password flow was built from a published Nest.js tutorial's general
shape (request a link by email, submit a token + new password to consume it), but its
concrete implementation had three real gaps not worth carrying into this codebase:

1. It threw `NotFoundException` when the email wasn't registered — a user-enumeration
   hole. An attacker can tell which emails have accounts just by watching which requests
   404 versus succeed.
2. It stored the reset token as a plain JWT on the user row (`user.resetToken = token`)
   but never actually compared it during reset — only the JWT's own signature and
   expiry were checked. The stored value was dead code, and nothing marked a token used,
   so a previously-issued, still-unexpired link kept working even after a newer one was
   requested.
3. It stored that token raw. A leaked database would hand out every outstanding,
   directly-usable reset link.

There is also no SMTP/email-sending infrastructure anywhere in this project — Phase 1 is
explicitly local-only (CLAUDE.md §2, §7).

## Decision
- **`POST forgot-password` always returns the same response**, whether or not the email
  belongs to a real account. No branch a caller can observe reveals which case occurred.
- **The token is opaque and random** (`crypto.randomBytes(32)`, 256 bits), not a JWT — a
  single-use secret needs no payload, audience or signature, just enough entropy to be
  unguessable.
- **Only a SHA-256 hash of the token is ever stored** (`PasswordResetToken.tokenHash`).
  A fast hash is correct here, unlike passwords: the input is already 256 bits of random
  data with no guessable structure, so bcrypt's deliberate slowness buys nothing.
- **Single-use, enforced in code, not left to expiry alone.** `resetPassword` marks the
  token `usedAt` the moment it succeeds — burned first, before the password write, so
  even a failure partway through can never leave a replayable token behind. A new
  `forgot-password` request also invalidates any of that user's still-unused older
  tokens, so only the most recently requested link ever works.
- **One generic error for every failure mode** ("This reset link is invalid or has
  expired") — expired, already used, and never-existed all produce the identical
  `ECB001` response, so a caller probing tokens learns nothing about which case they hit.
- **Role-agnostic.** `AuthService.forgotPassword`/`resetPassword` live in the shared
  `packages/auth`, not a per-app service — one `User` row has exactly one password
  (§4.1), so recovery must not care which app's door the request came through. CLAUDE.md's
  own designs put "Forgot Password" / "Reset Link Sent" screens on the seller portal, a
  second, unrelated app that will need this exact logic.
- **A password reset also ends every other session.** The last step calls the same
  `incrementTokenVersion` logout already uses (ADR 0018) — if the account was actually
  compromised, resetting the password evicts whoever else is signed in too, not just the
  device doing the reset.
- **Emails are logged, not sent.** `MailService` (`packages/common`) writes the message,
  reset link included, to the server log instead of calling a real provider — there is no
  SMTP account, API key, or provider anywhere in this project. One class, one call site;
  swapping in nodemailer/SES/Postmark later touches only `MailService`'s body.

## Consequences
- The reset link is genuinely unusable to anyone who doesn't have the raw token from the
  original (logged, or eventually emailed) message — the database alone gives an attacker
  nothing.
- A locally-run dev server is the only way to see a reset link today (read the server
  log). This is a known, deliberate Phase 1 limitation, not an oversight — wiring a real
  provider is a follow-up, not a redesign, once one exists.
- `PasswordResetToken` mirrors `AdminInvite`'s shape (`expiresAt`/`usedAt`) but not its
  raw-code storage — `AdminInvite`'s codes were stored unhashed, a real but lower-
  severity gap that this ADR did not fix, only avoided repeating. *(Update: `AdminInvite`
  was removed in ADR 0038, so the gap no longer exists.)*
