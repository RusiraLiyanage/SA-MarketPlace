# ADR 0046 — Real email through Gmail, opt-in, never waited for

## Context
Until now the only email was the password-reset link, and `MailService` printed it in the API terminal (ADR 0029): there was
no provider and the brief asks for a local-only system with no external data pushes. A buyer can't read an API terminal, so
the reset flow only worked for a developer. Google OAuth credentials were provided for sending real email.

## Decision
- **`MailService` sends through the Gmail account it is configured for** (`nodemailer`, Gmail with OAuth2). It needs
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` and `MAIL_FROM_ADDRESS`; `MAIL_FROM_NAME` is optional.
- **It is opt-in.** With none of them set it logs the message as before, so a clean checkout, the tests and every developer
  without credentials work unchanged. With some set it warns, naming the missing ones, and logs.
- **It never throws and is never waited for.** `forgot-password` answers the same, and in the same time, for an address with
  no account (ADR 0029). Waiting on a send would make existing accounts measurably slower, which is the same leak by timing.
  A failed send is logged (without the message) and the request still succeeds.
- **A real send does not log the message body**, which holds a one-time link. Only that it was sent, and to whom.
- **Every email shares one branded layout** (`packages/common/src/modules/mail/templates/layout.ts`): table-based HTML with inline styles
  (email programs ignore most CSS), no remote images, a button plus a copy-and-paste link, and a plain-text version made from the same words.
  Anything a person typed is escaped. A new email is a small file that supplies words only; see the README.
- **The refresh token comes from a one-off script**, `pnpm mail:token`, which signs in through the browser and writes the token and the
  sender address into `.env`. Secrets live only in `.env` (git-ignored); `.env.example` has blanks.

## Consequences
- This is a deliberate exception to "no external data pushes": an address and a reset link go to Google. It is off unless configured.
- A send is fire and forget, so a mail outage is only visible in the log. The buyer is told "if an account exists, a link is on its way".
- Gmail sends only from the authorised account and has daily limits; fine for this project, not for a real marketplace (use a
  transactional provider then, replacing `MailService`'s body only).
- A Google OAuth client in **Testing** mode expires refresh tokens after 7 days; run `pnpm mail:token` again, or publish the app.
- Seeded accounts have fake addresses and would bounce; to see an email, register with an inbox you own.
- Change-password sends no email (the buyer is signed in; ADR 0030). A "your password was changed" notice is a possible later addition.
