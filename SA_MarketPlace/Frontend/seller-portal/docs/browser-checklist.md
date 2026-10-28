# Browser walkthrough and known limitations

The portal has no fake backend and no sample data, so what the unit tests cannot cover (pages, the Redux store, the real API) is checked here, in a browser,
against a freshly seeded database. Run it before every pull request. Start the supplier API, then `pnpm dev`; every seeded password is `Password123!`.

```bash
pnpm db:seed        # in Backend/, resets the data this walkthrough changes
```

## Walkthrough

| # | As | Do | Expect |
|---|---|---|---|
| 1 | visitor | Open `/orders` | Sent to sign in, then back to Orders after signing in |
| 2 | visitor | Register a new business (a real inbox if email is on) | Lands on "under review" with the details typed |
| 3 | `r.patel@clinicalsupplies.com.au` | Sign in | Pending screen; the portal's pages are not reachable |
| 4 | `d.liu@cheaptestkits.com.au` | Sign in, read the reason, Update and resubmit | Back to pending with the new details |
| 5 | `priya@bindimedsupply.com.au` | Sign in | Dashboard: three numbers, the dispatch queue with SLA badges, Catalogue badge in the sidebar |
| 6 | priya | Orders: search, status chips, sort, page size | The address changes with each; reload keeps them |
| 7 | priya | Open a new order, tick the pick list, confirm dispatch | Order moves to Dispatched; dashboard count falls; invoice downloads with its file name |
| 8 | priya | Open another new order, "Cannot fulfil this order", choose a reason | Order is Cancelled; stock goes back; the buyer sees it |
| 9 | priya | Catalogue: search, status chips, sort; price and stock are plain text with nothing to type into; change them through Edit | The new values show in the list after saving and stay after reload |
| 10 | priya | Add product with images; Save draft, then Publish | It appears on the customer shop only once published; a repeated SKU shows on the SKU box |
| 11 | priya | Retire a product, then open it | Read-only; its SKU stays reserved |
| 12 | priya | Business profile: change the carrier and Save changes; change SLA | Saved, the dashboard countdowns move; "no changes to save" when nothing changed |
| 13 | priya | Change the password, then change it back | Still signed in; the old password no longer works; other tabs are signed out |
| 14 | priya | Sign out | Back at sign-in; the back button does not show the portal |
| 15 | any | Wait 15 minutes, then act | "Session expired" pop-up; sign in again returns to the same page |
| 16 | priya | Change any box on Business profile or an Edit product page, then click another sidebar item | "Save your changes?": Keep editing stays, Discard changes leaves, Save changes saves and then goes on; with nothing changed there is no prompt |

## Accessibility pass (step 9)

Run axe-core 4.10 (WCAG 2.0/2.1 A and AA, plus best practice) from the browser console on each page and pop-up:

```js
const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js'
s.onload = async () => console.log((await axe.run()).violations); document.head.append(s)
```

Last run, no violations on: sign in, register, forgot and reset password, session expired, not found, pending application, dashboard, orders,
order fulfilment, cancel order, catalogue, retire, add and edit product, business profile and sign out. Keyboard: the first Tab stop is "Skip to
main content", which moves focus into the page; page titles are announced on every route change.

## Known limitations

- **Narrow screens.** Below 992 px the sidebar becomes a bar with a menu button and a drawer, but the pages themselves are not responsive: tables scroll sideways and the dashboard cards squeeze. Responsive layouts are Phase 2.
- **15-minute sessions.** There are no refresh tokens (backend ADR 0030). A seller filling a long product form can be signed out and lose it; images could not be kept anyway. Saving as a draft often is the workaround.
- **The pick list is not saved.** A refresh forgets the ticks; the backend has no status for it.
- **Seeded product images do not exist.** Seeded products show the placeholder icon; products created in the portal show their pictures.
- **Backend gaps.** No "delivered" action, no storage conditions or shelf life on a seller's product, no choosing a primary image.
- **No page or store tests.** Covered by this checklist until an end-to-end suite exists (Phase 2).
