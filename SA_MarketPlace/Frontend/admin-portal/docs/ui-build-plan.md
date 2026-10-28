# SA Admin: UI build plan

Plan for the staff app of the marketplace: `Frontend/admin-portal`. It talks to the admin API (`Backend/apps/admin-api`, port 8003, `/api/admin/v1`).
It is built the same way as the seller portal (`../seller-portal`), with the admin's purple, and **where the designs and the backend disagree the
backend wins** (section 4).

Status: **steps 0 (backend CORS header), 1 (scaffold), 2 (auth), 3 (supplier queue), 4 (application review), 5 (orders list), 6 (order detail), 7 (my profile) and 8 (polish) are done**. Designs: 11 screens in `Updated Designs/Admin`, plus two newer versions of the
supplier list, and the Figma file `i3v2ts6Ig7O874InEAL899` (the frames named `Admin_-_…`).

## 1. Scope

In: sign in, create an account (staff email domains only), forgot and reset password; the supplier verification queue; one application's review with
approve and reject; all orders (filter, search, sort, paging, CSV export) and an order's detail with invoice download; my profile (name, password,
sign out). All connected to the real API.

Out (Phase 2 or later, per `CLAUDE.md`): inviting administrators (backend ADR 0038 dropped invitations), ABN lookup automation (the review checklist is a
manual aid), admin reporting dashboards (Phase 3), editing an order or its fulfilment (read-only by design), suspending or offboarding a supplier,
"keep me signed in", mobile layouts.

## 2. Screens, routes and endpoints

| Step | Screen | Route | Endpoints |
|---|---|---|---|
| 2 | Sign in, create account, forgot and reset password | `/login`, `/register`, `/forgot-password`, `/reset-password` | `POST auth/login`, `auth/register`, `auth/forgot-password`, `auth/reset-password` |
| 2 | Session expired (pop-up) | `/session-expired` | |
| 3 | Supplier verification (queue), its empty state | `/suppliers` | `GET suppliers` (status, search, sort, paging), `GET suppliers/summary` (tabs, banner, sidebar badge) |
| 4 | Supplier application, approve and reject pop-ups | `/suppliers/:supplierId`, `…/approve`, `…/reject` | `GET suppliers/:id`, `POST suppliers/:id/approve`, `POST suppliers/:id/reject` |
| 5 | All orders, its empty state, Export CSV | `/orders` | `GET orders`, `GET orders/export` |
| 6 | Order detail, invoice download | `/orders/:orderNumber` | `GET orders/:n`, `GET orders/:n/invoice` |
| 7 | My profile, sign out (pop-up) | `/profile`, `/profile/sign-out` | `GET auth/profile`, `PATCH auth/profile`, `POST auth/change-password`, `POST auth/logout` |

The seeded admin is `a.morgan@sampleassist.com.au` (password `Password123!`). A fresh seed has one pending supplier (Clinical Supplies Co), one rejected and two approved; once the pending one is decided the queue is empty until someone registers in the seller portal.

## 3. Decisions carried from the seller portal

Same stack and rules, no new libraries: React 19, Vite, TypeScript, Ant Design 6, styled-components reading AntD tokens, Redux Toolkit with RTK Query,
Vitest and Testing Library, ESLint, pnpm, latest versions. Same structure (`src/{router,auth,components,pages,store,infra,hooks,utils,styles,constants,patterns,test}`),
`src/...` imports, `SA`-prefixed shared parts, one `SATable`, pop-ups as child routes drawn with `SADialog`, pages that edit saved data ask before they are
left (`UnsavedChangesDialog`), URL-driven list queries, brand-first page titles, no sample data and no fake backend (each slice is built against the real API),
tests in `__tests__` beside the code, a browser walkthrough per step.

## 4. Where the designs and the backend disagree (the backend wins)

| # | Design | Built | Why |
|---|---|---|---|
| 1 | Sign in: "Keep me signed in" | Left out | Tokens last 15 minutes with no renewal (ADR 0045) |
| 2 | Sign in footer: "there is no self-registration" | Sign in links to "Create an account"; the footer says accounts are for Sample Assist staff addresses | The backend has registration, limited to `ADMIN_EMAIL_DOMAINS` (ADR 0038) |
| 3 | Register: invitation code, "codes expire after 7 days" | No code. A note says only Sample Assist staff email addresses are accepted | Invitations were dropped (ADR 0038) |
| 4 | Register: no terms box | A required "I agree to the terms" tick | The backend requires `acceptTerms` |
| 5 | Register: password "8 characters with one number" | The backend rule: 8+ with upper, lower, number and symbol | `PATTERNS.PASSWORD` |
| 6 | Application review: "Role / title" | Left out | No such column; the seller sign-up omitted it too |
| 7 | Review: product categories shown for a pending supplier | "None yet" until they list products | Categories come from the supplier's products (ADR 0040) |
| 8 | Review: verification checklist | Three tick boxes on the screen only; nothing is stored. Approve is disabled, with a notice beside the boxes, until all three are ticked; Reject never waits | Manual check in Phase 1; gated so the manual ABN check is hard to skip (a change from the designs, which show Approve enabled with a box unticked) |
| 9 | Approve and reject on every application | Only while it is pending; a decided one is shown with who decided, when and why | `409` otherwise |
| 10 | Reject: reason list and detail | The backend's four reasons; detail is required for "Other" | `RejectionReason`, `DETAIL_REQUIRED` |
| 11 | Orders: Payment filter "All / Paid / Pending" | The backend's four payment statuses: Pending, Paid, Failed, Refunded | `PaymentStatus` |
| 12 | Orders: Fulfilment filter | The backend's five stages: Received, Picking, Dispatched, Delivered, Cancelled | `FulfilmentStage` |
| 13 | Payment tag "Paid (mock)" | "Paid (mock)" for a paid mock payment, else the status | Payments are simulated in Phase 1 |
| 14 | Export CSV | Exports what the table shows (filters and sort, no paging); refused over 10,000 rows with the backend's message | `GET orders/export` |
| 15 | Order detail: Download invoice always on | On only once the order is dispatched or delivered, with a reason shown otherwise | `canDownloadInvoice` |
| 16 | Profile: editable-looking email and a Role box | Name is the only editable field; email and role are shown read-only | `PATCH auth/profile` takes the name only (ADR 0028) |
| 17 | Profile: current password box | The current password is shown as dots (read-only), as in the other two apps; the new and confirm boxes work, and "your other devices will be signed out" | The backend takes only the new password, since the signed-in session is the proof (ADR 0030) |
| 18 | Profile: "Admin team: Invite administrator" | Left out | Invitations were dropped (ADR 0038) |
| 19 | Breadcrumb "Device Management ›" | Dropped (`Suppliers`, `Suppliers › Business name`, `Order Management › ORD-…`) | A leftover from the Collection Manager file name |
| 20 | Forgot and reset password: not designed | Built like the seller portal's | The backend has them; the reset link goes to port 5175 |

## 5. Colour and accessibility

SA Admin's purple is `#722ed1`. White on it is 6.9:1 and it is 6.9:1 as text on white, so (unlike the seller portal's orange) it needs no dark button text
and no darker link colour. Placeholders, hints and tags keep the contrast fixes from the seller portal. Same accessibility rules: one `h1` per page, named
dialogs, labelled fields, skip link, announced page titles; axe is run on every page in step 8.

## 6. Architecture

Copied from the seller portal (decision: copy, no shared package; see section 8): `infra`, `hooks`, `utils` (format, download, form rules, ABN display),
`components` (the `SA…` parts, `SADialog`, `UnsavedChangesDialog`, the two layouts), `router`, `styles`, `store/{hooks,rootReducer,index}` and the auth store,
`auth/{PrivateRoute,PublicRoute}`, test helpers and config. Own: the session key (`sa.admin.session.token`), the API address, tag names
(`Order`, `Profile`, `Summary`, `Supplier`), the purple, the sidebar (Suppliers with a badge, Orders, My Profile) and every page.

Stores (RTK Query, one `api` slice, each feature injects its endpoints): `auth`, `suppliers` (list, summary, application, approve, reject; a decision invalidates
`Supplier` and `Summary`, so the badge and tabs update at once), `orders` (list, detail, CSV export and invoice as blobs), `profile`.

## 7. Build steps

| # | Step | Done when |
|---|---|---|
| 0 | **Backend prerequisite:** `admin-api` exposes `Content-Disposition` over CORS (export and invoice file names) | The browser can read the file name |
| 1 | **Scaffold:** `pnpm create vite`, copy the base, purple theme, sidebar and routes with placeholder pages | Typecheck, lint, tests and build pass; the shell shows |
| 2 | **Auth:** sign in, create account, forgot and reset password, session, guards, sign out | A seeded admin signs in and out; a staff address registers; a seller address is refused |
| 3 | **Supplier queue:** list, search, status tabs with counts, banner, sidebar badge, empty state | The numbers match the database |
| 4 | **Application review:** details, checklist, approve and reject pop-ups, decided view | A pending supplier is approved or rejected, is emailed, and signs in (or sees the reason) |
| 5 | **Orders:** list with filters, search, sort, paging, empty state, Export CSV | The CSV matches the table |
| 6 | **Order detail:** items, delivery and tracking, invoice download | A dispatched order's invoice downloads |
| 7 | **My profile:** name, change password, sign out, unsaved-changes prompt | A new name shows everywhere; the password changes and is restored |
| 8 | **Polish:** axe on every page, walkthrough checklist, loading and error states, docs, delivery report, pull-request split | Every route checked in the browser |

## 8. Decisions (settled)

1. **Shared code:** copy the files, as the seller portal did. It is now three copies of about 35 files; extracting a shared package is the first thing to weigh before a fourth app.
2. **Purple:** `#722ed1`, no accessibility override needed (section 5).
3. **Folder and port:** `Frontend/admin-portal`, port 5175 (the backend's `ADMIN_RESET_URL`).
4. **Verification checklist:** screen-only (nothing is stored), but Approve stays disabled until all three boxes are ticked (section 4, row 8).

## 9. Testing and definition of done

As for the seller portal: unit tests for pure logic (query builders, status mapping, name rules), component tests for forms and dialogs with the store hooks mocked,
and a browser walkthrough per step against the seeded API, recorded in `docs/browser-checklist.md`. Done also means: lint and type checks clean, a clean checkout runs from the
README, and anything non-obvious is written down.

## 10. Risks

- **Admin sign-up is a speed bump, not a lock.** Nothing checks that the person owns the mailbox (ADR 0038 says so). Fine locally with fake data; it must be replaced before real use.
- **Duplicated code.** Three copies of the shared parts now exist. A fix to a copied file goes into all of them.
- **Large exports.** The backend refuses a CSV over 10,000 rows before sending anything; the screen shows its message and suggests narrowing the filters.
- **Approve and reject cannot be undone.** The pop-ups say so, and the buttons are off for a decided application.
