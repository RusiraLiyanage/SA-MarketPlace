# Architecture decision records

Decisions made while building the backend, recorded per CLAUDE.md §7.
One file per decision: context, the decision, and what it costs.

| ADR | Decision |
|---|---|
| [0001](0001-hand-written-migrations.md) | Hand-written SQL migrations, not generated ones |
| [0002](0002-local-env-config.md) | Local .env instead of AWS AppConfig |
| [0003](0003-real-http-status-codes.md) | Real HTTP status codes, not always-200 |
| [0004](0004-static-module-imports.md) | Static module imports, not runtime discovery |
| [0005](0005-intl-over-moment.md) | Intl.DateTimeFormat instead of moment |
| [0006](0006-snake-case-naming-strategy.md) | A naming strategy instead of explicit column names |
| [0007](0007-uuid-extension-pgcrypto.md) | uuidExtension: 'pgcrypto' for gen_random_uuid parity |
| [0008](0008-numeric-as-string.md) | Money stays a string, never a float |
| [0009](0009-timestamps-per-entity.md) | Timestamps declared on every entity, no base class |
| [0010](0010-seed-truncates-and-generates-ids.md) | The seed clears its tables and generates ids |
| [0011](0011-lowercase-email-storage.md) | Lowercase email storage, not a functional index |
| [0012](0012-on-delete-restrict-by-default.md) | ON DELETE RESTRICT by default |
| [0013](0013-single-validation-pipe.md) | One validation pipe, no hand-written value conversion |
| [0014](0014-filter-keeps-exposed-4xx.md) | The exception filter keeps the status of exposed 4xx errors |
| [0015](0015-middleware-wildcard-nest10.md) | Middleware wildcard is '*' on Nest 10 |
| [0016](0016-per-app-ports.md) | Each app owns its port; no shared PORT |
| [0017](0017-jwt-auth-with-passport.md) | JWT access tokens via Passport, shared in packages/auth |
| [0018](0018-logout-via-token-version.md) | Logout bumps a token version on the user row |
| [0019](0019-per-app-audience-and-allowed-roles.md) | Each app has its own token audience and allowed roles |
| [0020](0020-rate-limit-login-and-signup.md) | Login and sign-up are rate limited per IP, in memory |
| [0021](0021-catalogue-requires-sign-in.md) | The catalogue requires sign-in |
| [0022](0022-order-number-sequence.md) | Order numbers come from a Postgres sequence, not count()+1 |
| [0023](0023-checkout-transaction-ordering.md) | Checkout re-validates the cart and reserves stock before charging |
| [0024](0024-mock-payment-gateway.md) | Mock payment gateway: fixed test numbers, no card data stored |
| [0025](0025-ownership-checks-return-404.md) | Ownership checks return 404, not 403 |
| [0026](0026-reorder-repopulates-cart.md) | Reorder repopulates the cart; it never creates an order directly |
| [0027](0027-profile-enrichment-stays-app-side.md) | Profile enrichment stays app-side; packages/auth stays generic |
| [0028](0028-profile-edit-excludes-identity-fields.md) | Profile edit excludes email, password and organisation |
| [0029](0029-password-reset-tokens.md) | Password reset: opaque hashed tokens, no enumeration, session-wide invalidation |
| [0030](0030-change-password.md) | Change password: no current-password check, session survives its own token bump, real-length dots |
| [0031](0031-seller-registration.md) | Seller registration: pending profile, split contact name, form fields without a home |
| [0032](0032-seller-application-status.md) | Seller application status: tracked dates, a persisted acknowledgement, resubmission |
| [0033](0033-utc-instants-only.md) | Every date-time is a UTC instant; no bare date columns |
| [0034](0034-seller-dashboard.md) | Seller dashboard: approval guard, order buckets, what the counts mean |
| [0035](0035-seller-catalogue.md) | Seller catalogue: one product form, images in the same request, local image storage |
| [0036](0036-seller-orders.md) | Seller orders: dispatch, cancel, and one shared invoice |
| [0037](0037-seller-business-profile.md) | Seller business profile: what can be edited, the password rule, names that must fit |
| [0038](0038-admin-auth.md) | Admin auth: sign-up limited to allowed email domains, no invitations |
| [0039](0039-admin-profile.md) | Admin profile: the name only, the password rule, and a recorded last sign-in |
| [0040](0040-product-categories-from-products.md) | Product categories are worked out from a supplier's products |
| [0041](0041-admin-supplier-verification.md) | Admin supplier verification: the queue, the application screen and the decision |
| [0042](0042-admin-orders-and-csv-export.md) | Admin orders oversight and the CSV export |
| [0043](0043-pdf-browser-recovers-itself.md) | The PDF browser relaunches and retries when Chromium dies |
| [0044](0044-explicit-swagger-fields.md) | Swagger fields are declared explicitly where auto-detection fails |
| [0045](0045-refresh-tokens-deferred.md) | "Keep me signed in" (refresh tokens) is deferred, with the design if revived |
| [0046](0046-real-email-through-gmail.md) | Real email through Gmail: opt-in, never waited for, never logs the link |
