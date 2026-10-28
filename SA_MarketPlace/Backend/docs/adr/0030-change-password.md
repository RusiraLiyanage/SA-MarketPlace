# ADR 0030 — Change password: no current-password check, session survives its own token bump, real-length dots

## Context
My Profile's "Change Password" section (per the Figma design) shows the current password
as a static dots display — not an editable input — with only "New password" and "Confirm
new password" fields below it. That shapes three decisions a typical "change password"
endpoint wouldn't need to make:

1. There is no field for the user to type their actual current password into, so there is
   nothing for the backend to verify it against.
2. The design's dots are sized to the real password, not a fixed placeholder — confirmed
   directly rather than assumed, since every other product (GitHub, Google, etc.) uses a
   fixed-length placeholder and bcrypt hashes give no way to recover that length later.
3. `changePassword` reuses the same `incrementTokenVersion` mechanism as logout and
   password reset (ADR 0018), which evicts every token for the account — including the one
   the caller is using to make this very request.

## Decision
- **No current-password verification.** `POST /auth/change-password` is authorized by the
  JWT alone; `ChangePasswordDto` has only `newPassword`. This is a deliberate, confirmed
  trade-off, not an oversight: a hijacked or left-open session can change the password with
  no extra proof, which is weaker than the usual "re-prove the password" pattern. It is
  confined to this one endpoint — login, reset-password and the rest of the app are
  unaffected.
- **No `confirmPassword` field either.** Matching "New password" against "Confirm new
  password" is a pure client-side concern — the backend only ever receives the single,
  already-agreed-upon value. Same convention `RegisterDto`/`ResetPasswordDto` already use
  (proven by an existing e2e test: an extra `confirmPassword` field on `register` is
  rejected by `forbidNonWhitelisted`).
- **A no-op change is still rejected.** Without a current-password input there's no proof
  to check, but the stored hash is still compared against the new value
  (`bcrypt.compare(newPassword, user.passwordHash)`) purely to block silently "changing" to
  the same password.
- **The calling session survives its own `tokenVersion` bump.** Every other session is
  evicted exactly as logout/reset-password do, but `changePassword` re-issues a fresh
  `access_token` (via the same `login()` used by register/login) rather than leaving the
  caller holding a token it just invalidated. The bumped `tokenVersion` is re-read from the
  database rather than assumed to be `+1`, so this stays correct even under a concurrent
  write.
- **A new `User.passwordLength` column tracks the real character count**, written
  alongside `passwordHash` everywhere it changes (register, reset-password,
  change-password) and returned by `GET /auth/profile`. Never the password or its hash —
  only its length, so the frontend can render dots sized to the real password without the
  password ever leaving the backend.

## Consequences
- Anyone who can present a valid, unexpired JWT for an account can change its password
  without further proof. If this later proves too weak (e.g. a security review, or the
  design changes to include a real current-password input), the fix is additive: add the
  field back to the DTO and the bcrypt check back to the service — nothing here needs to be
  undone.
- `passwordLength` is a small, low-severity information leak: anything that can read a
  profile learns the exact length of that account's password. Accepted as part of the same
  design confirmation as the dots themselves.
- `passwordLength` must be kept in sync by hand at every site that writes `passwordHash` —
  there are only three (register, reset-password, change-password), and nothing enforces
  the pairing structurally. A future write path that sets `passwordHash` without also
  setting `passwordLength` would silently leave the dots display stale, not wrong in a way
  that breaks anything else.
