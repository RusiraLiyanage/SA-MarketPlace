# Browser walkthrough and known limitations

The app has no fake backend and no sample data, so what the unit tests cannot cover (pages, the Redux store, the real API) is checked here, in a browser,
against a freshly seeded database. Run it before every pull request. Start the admin API (`pnpm dev` in `Backend/` runs all three APIs), then `pnpm dev`
here. The seeded admin is `a.morgan@sampleassist.com.au`, password `Password123!`.

```bash
pnpm db:seed        # in Backend/, resets the data this walkthrough changes
```

## Walkthrough

| # | As | Do | Expect |
|---|---|---|---|
| 1 | visitor | Open `/orders` | Sent to sign in, then back to Orders after signing in |
| 2 | visitor | Sign in with a wrong password, then with a seller's email | The backend's message each time ("Invalid email or password", "This account cannot sign in here") |
| 3 | visitor | Create an account with a Gmail address, then with a `@sampleassist.com.au` one | The first is refused with the staff-only message; the second signs in at once |
| 4 | visitor | Forgot password for a seeded address, then open a reset link with a bad token | "Check your email" (never saying whether the account exists); "This reset link is invalid or has expired" |
| 5 | admin | Open Suppliers | The pending queue, oldest first, with "Waiting N days"; the banner, the chip counts and the sidebar badge agree |
| 6 | admin | Search a business name, then an ABN with spaces, then use each chip | The list follows; the address holds the view; an empty result offers Clear filters |
| 7 | admin | Review a pending supplier; tick the checklist boxes | Details and contact shown; Approve is disabled, with a notice saying why, until all three boxes are ticked (Reject is always available); the ticks are not saved |
| 8 | admin | Reject it: choose "Other" with no detail, then add one | "Tell the applicant why" until a detail is given; then a Decision card with who, when and the reason; the badge falls by one |
| 9 | seller | Sign in to the seller portal as the rejected seller | The rejected screen shows the reason as written, and Update and resubmit puts it back in the queue |
| 10 | admin | Approve another pending supplier | The Decision card says Approved; the seller can now sign in and reach their dashboard |
| 11 | admin | Open the same pending application in two tabs; decide it in one, then try to decide it in the other | The second shows "This application has already been approved or rejected" and the page refreshes to the decision |
| 12 | admin | Orders: filter by payment and fulfilment, search a customer, sort by value, page | The list follows each; nothing editable anywhere |
| 13 | admin | Export CSV with a filter on | A file named by the server whose rows are exactly what the table showed |
| 14 | admin | Open a dispatched, a received, a cancelled and a delivered order | Invoice on only for dispatched and delivered (and it downloads a PDF); "Not yet dispatched" before dispatch; a cancelled order says why |
| 15 | admin | Open an unknown order number and an unknown application id | "Order not found" and "Application not found", never the previous record |
| 16 | admin | My profile: change the name and click Orders; then Discard on another try | The prompt saves and goes on (or leaves without saving); the summary shows the new name |
| 17 | admin | Change the password and change it back | Still signed in; the other sessions are signed out; the old password stops working in between |
| 18 | admin | Sign out, then press Back | Back at sign-in; the portal is not shown |
| 19 | any | Wait 15 minutes, then act | "Session expired" pop-up; signing in again returns to the same page |

## Accessibility pass (step 8)

Run axe-core 4.10 (WCAG 2.0/2.1 A and AA, plus best practice) from the browser console on each page and pop-up:

```js
const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js'
s.onload = async () => console.log((await axe.run()).violations); document.head.append(s)
```

Last run, no violations and one `h1` on each of: sign in, register, forgot password, reset password (with and without a token), session expired; the pending
queue, All, and the empty queue; a pending application, the approve and reject pop-ups, a decided application, and an unknown one; the orders list (default,
sorted and filtered, empty); orders that are dispatched, received, cancelled and unknown; My profile, the sign-out pop-up and the unsaved-changes prompt;
and the 403, 500 and 404 pages. Keyboard: the first Tab stop is "Skip to main content", which moves focus into the page; page titles are announced on every
route change; below 992 px the navigation is a menu button that opens a drawer.

## Known limitations

- **Narrow screens.** Below 992 px the sidebar becomes a bar with a menu button and a drawer, but the pages themselves are not responsive: tables squeeze and long emails wrap. Responsive layouts are Phase 2.
- **15-minute sessions.** There are no refresh tokens (backend ADR 0030). An admin can be signed out while typing a name on the profile; the page cannot keep it.
- **Admin sign-up is a speed bump.** It only checks the email's domain (backend ADR 0038), so anyone can create `anything@sampleassist.com.au` and approve suppliers. Fine for local fake data; replace it before any real use.
- **Decisions cannot be undone.** There is no suspend or offboarding in Phase 1; the approve and reject pop-ups say so.
- **The checklist is not saved.** The three ticks only unlock Approve on the screen; the backend has no field for them, so nothing proves the checks were made.
- **Large exports.** The backend refuses a CSV over 10,000 rows before sending anything; the screen shows its message, and narrowing the filters is the way round it.
- **No page or store tests.** Covered by this checklist until an end-to-end suite exists (Phase 2).
