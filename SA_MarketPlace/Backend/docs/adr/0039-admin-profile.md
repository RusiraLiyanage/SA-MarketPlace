# ADR 0039 — Admin profile: the name only, the password rule, and a recorded last sign-in

## Context
The admin My Profile screen shows who is signed in and lets them change their name and their
password. It follows the customer and seller profiles (ADR 0028, 0030, 0037), with three things of
its own: the design draws the email and role as fields, it has a real "Current password" input, and
its side card shows "Admin since" and "Last sign-in". Only the first of those two dates exists in the
data.

## Decision
- **Same structure as the other apps.** `GET` and `PATCH /auth/profile` share one response shape
  (`MyAdminProfile`, in `auth.typing.ts`) and `POST /auth/change-password` sits beside them, with
  logout. All three require an admin: the token's role is checked as well as its audience, so a token
  for this app that does not carry the admin role gets 403.
- **Only the full name is editable.** It is split on the last space, as at registration, each part at
  most 100 characters. The email is the sign-in identity (ADR 0028) and the role is assigned by the
  platform, so both are shown, not edited; the validation pipe rejects them, and a password, status or
  date, with 400 rather than ignoring them. An empty body is a no-op that writes nothing.
- **Change password follows ADR 0030, not the design's input.** The screen shows the current password as
  dots, sized from `passwordLength`, and only the new password is typed (twice, matched in the browser).
  `change-password` takes only `newPassword`, authorised by the token; `currentPassword` and
  `confirmPassword` are rejected. A same-as-current password is refused, every other session is signed
  out, and a fresh token comes back for this one. It is rate limited, with the throttle running before
  the token check.
- **"Admin since" is the account's creation date**, which already existed.
- **"Last sign-in" is a new column**, `user.last_sign_in_at` (nullable, added by a reversible
  migration). `UsersService.recordSignIn` stamps it, and the admin app calls it after the password has
  been checked at login, and at registration, since a new admin is signed in at once. It is **not**
  stamped by a wrong password, by changing a password (a fresh token is not a sign-in), or by anyone
  else signing in.

## Consequences
- **Only the admin app records it.** A person who is also a buyer or seller, and signs in there, does not
  move it, so for them it means "last admin sign-in". The seller and customer apps do not show it.
- **Existing accounts show no last sign-in until their next one.** There is nothing to backfill from.
- **Only the latest sign-in is kept**, not a history. A real audit trail is Phase 3.
- **Anyone holding a valid admin token can change that admin's password without further proof**, the
  trade-off ADR 0030 accepted. It matters more here, because an admin account can approve suppliers and see
  every order. The fix is additive: put `currentPassword` back in the DTO and check it in the service (the
  seller profile's first draft did exactly that).
- **The design shows a "Current password" input** and the frontend will show dots in its place.
- **No avatar, phone or email change.** The initials on the side card are the frontend's.
