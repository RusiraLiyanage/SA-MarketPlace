# Pull request guide

How to review and merge `phase-1-completed`. It is a long branch (about 600 files, 53,000 lines against `main`), so it is split into
ten pull requests that follow the commits already on it. **No history is rewritten**: each pull request is a branch label placed
on an existing commit, and each one is based on the one before it.

> The remote in this repository is named `main` (not `origin`), so `main` can mean the remote or a branch. Below, `main/main` is the
> remote's `main` branch and `main` after `git push` is the remote.

## 1. Check the tree is clean

Everything is committed (the last commit is `db0bbfc`). Run every command in this guide from the repository root (the folder that contains
`SA_MarketPlace`).

```bash
git status --short
```

It should print nothing. `Backend/.env` is git-ignored and must never show up here.

## 2. Create the branches

Each line puts a branch on the last commit of that pull request.

```bash
git branch pr/01-backend-phase-1          9298cd9
git branch pr/02-frontend-foundations     75f813d
git branch pr/03-frontend-auth-shop-ui    ccebd8c
git branch pr/04-frontend-orders-ui       2bb0da3
git branch pr/05-redux-auth-profile       a95b10a
git branch pr/06-redux-shop-cart-orders   c8850d4
git branch pr/07-real-email-notify-me     203113a
git branch pr/08-tests-in-folders         dff631d
git branch pr/09-ui-polish-email-design   c6d0ad1
git branch pr/10-remove-sample-data       db0bbfc
```

Before opening them, check that each one builds and passes on its own (the end state is verified; the in-between states are not). The front end
needs Node 24 or newer (`nvm use` reads `.nvmrc`):

```bash
for b in pr/02-frontend-foundations pr/03-frontend-auth-shop-ui pr/04-frontend-orders-ui \
         pr/05-redux-auth-profile pr/06-redux-shop-cart-orders pr/07-real-email-notify-me \
         pr/08-tests-in-folders pr/09-ui-polish-email-design pr/10-remove-sample-data; do
  git switch -q --detach "$b" && (cd SA_MarketPlace/Frontend/customer-facing-frontend \
    && pnpm install --frozen-lockfile >/dev/null && pnpm typecheck && pnpm lint && pnpm test) \
    || echo "FAILS: $b"
done
git switch phase-1-completed
```

If one fails, fix it on a new commit at that point, or merge it with the next pull request.

## 3. Open the pull requests, in order

Push the branches (`git push main pr/01-backend-phase-1 pr/02-frontend-foundations ...`). In Bitbucket, each pull request's
**destination is the previous branch**; PR 1's destination is `main`. When one merges, change the next one's destination to `main`.

| # | Branch (destination) | Commits | What it contains | Size |
|---|---|---|---|---|
| 1 | `pr/01-backend-phase-1` (`main`) | up to `9298cd9` | The three APIs, shared packages, migrations, seed, tests (930), 45 ADRs, README and the first handover report | 376 files, 40,000 lines |
| 2 | `pr/02-frontend-foundations` (PR 1) | `9104dbe`, `cefa8f1`, `9352bce`, `75f813d` | Vite/React project, folder structure and routes, shared components (table, pagination, modals, tags, header, layouts) | 137 files, 6,700 lines |
| 3 | `pr/03-frontend-auth-shop-ui` (PR 2) | `144228f`, `5c4d6c4`, `ccebd8c` | Auth pages, shop, product detail, from sample data (removed again in PR 10) | 65 files, 2,600 lines |
| 4 | `pr/04-frontend-orders-ui` (PR 3) | `420e72b`, `a737ab6`, `30a6029`, `a21f64c`, `1130664`, `2bb0da3` | Cart, checkout, confirmation, My orders, order detail, profile, accessibility pass, colour change | 119 files, 4,300 lines |
| 5 | `pr/05-redux-auth-profile` (PR 4) | `e862094`, `a95b10a` | Store, API client, session, auth guards, profile | 62 files, 1,900 lines |
| 6 | `pr/06-redux-shop-cart-orders` (PR 5) | `1053f5d`, `33532a8`, `ce0fa05`, `b1509ab`, `dd42e78`, `c8850d4` | Products, cart, checkout and orders stores; backend order search and invoice file-name header | 82 files, 1,900 lines added |
| 7 | `pr/07-real-email-notify-me` (PR 6) | `203113a` | Gmail sending (ADR 0046), `pnpm mail:token`, mail tests; remove the unbuilt Notify me button and pop-up | 25 files, small |
| 8 | `pr/08-tests-in-folders` (PR 7) | `dff631d` | Every front-end test moved into a `__tests__` folder beside the code it covers. Renames only | 59 files, 0 lines changed |
| 9 | `pr/09-ui-polish-email-design` (PR 8) | `98e3b5f`, `c6d0ad1` | UI polish from using the app, spinners and loading states, branded email layout, the delivery report and this guide | 54 files, +900 / −290 |
| 10 | `pr/10-remove-sample-data` (PR 9) | `1f5dfb1`, `db0bbfc` | Removes the sample JSON, the fake backend, `msw`, `axe-core`, dead code, and the 27 test files that ran on them | 58 files, +80 / −4,200 |

PRs 3 to 6 add sample data, a fake backend and page tests that PR 10 later deletes. If you would rather not review code that ends up removed,
open PRs 3 to 6 only as history, or open one pull request for the final state of the front end (`git diff pr/02-frontend-foundations pr/10-remove-sample-data`).

### Pull request text

**PR 1: Backend Phase 1**
> The shared backend for the marketplace: customer, supplier and admin APIs on one PostgreSQL database, with migrations, seed data, 63
> operations, 930 automated tests and 45 decision records. Local only; payments are mocked.
> **Review:** start with `Backend/README.md` and `docs/report` (the report explains the design), then `packages/entities` (schema), then each app.
> **Run:** `cd SA_MarketPlace/Backend && cp .env.example .env && pnpm install && pnpm db:up && pnpm --filter @sa-marketplace/entities migration:run && pnpm db:seed && pnpm test`

**PR 2: Front-end foundations**
> The customer marketplace front end's skeleton: Vite, React 19, TypeScript, Ant Design 6, styled-components, routing with pop-ups as routes,
> and the shared parts every screen uses. Every page is still a placeholder.
> **Review:** `src/router`, `src/components`, `docs/ui-build-plan.md`. **Run:** `pnpm install && pnpm test` (Node 24+).

**PR 3: Auth, shop and product screens**
> Login, register, forgot and reset password; the shop with filters, search, sort and paging; the product page. Built from sample JSON, which a later
> pull request removes once everything talks to the API.
> **Review:** `src/pages/Auth`, `src/pages/Shop`, `src/pages/ProductDetail`. **Run:** `pnpm dev` and open `/shop`.

**PR 4: Cart, checkout, orders and profile screens**
> The remaining screens, still on sample data, plus an accessibility pass (axe on every page, page titles, skip link) and the darker brand blue
> `#0958d9` so button text passes WCAG AA (`CLAUDE.md` updated).
> **Review:** `src/pages/Cart`, `Checkout`, `Orders`, `OrderDetail`, `Profile`.

**PR 5: Redux foundations, sign-in and profile**
> Redux Toolkit with RTK Query in the Collection Manager's feature-folder shape; one API client (token header, one error shape, session expiry);
> sign-in, register, reset, sign-out and route guards; the profile. First screens that talk to the real API.
> **Review:** `src/infra`, `src/store/auth`, `src/store/profile`, `docs/state-and-api.md`. **Run:** start the customer API, then `pnpm dev` and sign in as `j.shaw@saclinics.com.au` / `Password123!`.

**PR 6: Products, cart, checkout and orders**
> Connects the rest to the API, with a fake backend for tests (removed again in PR 10). Two small, additive backend changes were needed: an order-number `search` on
> `GET /orders` (with end-to-end tests) and exposing `Content-Disposition` over CORS so the invoice keeps its file name.
> **Review:** `src/store/products|cart|checkout|orders`, `Backend/apps/customer-facing/src/modules/orders`, `src/main.ts`.
> **Run:** full flow: shop, cart, checkout with `4242 4242 4242 4242`, My orders, invoice, reorder.

**PR 7: Real email, and remove Notify me**
> Reset-password emails are sent through Gmail when `GOOGLE_*` settings are present, and only logged otherwise. Sending is never awaited, so
> `forgot-password` still answers the same and as fast for unknown addresses. `pnpm mail:token` obtains the refresh token. Tests do not send.
> Also: "Notify me" had no backend, so it promised an alert that never came. Out-of-stock products now show a disabled button; the pop-up, its
> route and the props that carried it are removed.
> **Review:** `packages/common/src/modules/mail`, `docs/adr/0046`, `src/components/ProductCard`. **Note:** no secrets are committed; `.env.example` has blanks.

**PR 8: Tests in `__tests__` folders**
> Moves all front-end tests into a `__tests__` folder next to the code they cover, so they are not mixed in with the source files. Pure renames plus
> the one-level-up import fixes; no test changed. **Review:** skim the file list; the diff is the paths.

**PR 9: UI polish, loading states and the email design**
> Fixes found by using the app: form spacing and a shared hint style (`SAFormItem`), a compact shop banner and filters, a darker search placeholder and a
> separate Search button, a smaller product page, a cart icon with an always-visible count, the nav underline, and the add-to-cart label centred.
> The product page now uses the same Add to cart control as the cards (a button, then the stepper once it is in the cart). Add to cart and the steppers show a
> spinner while the request runs (`usePending`).
> Backend: every email shares one branded layout (`packages/common/src/modules/mail/templates`), the reset email is the first on it, `pnpm mail:preview`
> writes them to HTML to look at. Also the updated delivery report, its PDF, and this guide.
> **Review:** `src/pages/Shop`, `src/pages/ProductDetail`, `src/components/SAFormItem.tsx`, `src/hooks/usePending.ts`, `packages/common/src/modules/mail/templates`.
> **Run:** `pnpm mail:preview` in `Backend/`, then open `storage/mail-preview/reset-password.html`.

**PR 10: Remove the sample data and fake backend**
> Every screen now reads from the API, so the sample JSON, the fake backend that answered requests in tests, `msw` and `axe-core` are removed, with
> the dead code (`SAPlaceholder`, an unused icon, helpers). The 27 test files that depended on them are removed too: 138 tests remain (helpers, forms,
> components). **Trade-off:** pages, the Redux store and the accessibility check no longer have automated tests; they are checked in the browser
> against the real API (`README.md` says so). **Review:** the deletions are the point; read `README.md` and `docs/state-and-api.md` for how to work now.

## 4. Merge checklist (from the brief's definition of done)

Before each merge: type check and lint clean; tests pass (backend on a freshly seeded database, `pnpm test:e2e` one app at a time);
`pnpm db:verify` passes; the README steps work from a clean checkout; self-review done. After PR 1 merges, retarget PR 2 to `main`, and so on.

## 5. Before you share the branch

- **Secrets:** `Backend/.env` holds a Google client secret and a refresh token. It is git-ignored; confirm with `git status` that it is not staged.
- **The first Google OAuth client** (ID beginning `25947075139-`) was pasted into a chat; delete it in Google Cloud.
- **Seed data:** the shared development database now holds a test buyer (`rusira.senath@gmail.com`) and one test order. `pnpm db:seed` resets it.
- **Test coverage:** the front end has 138 unit tests and no page tests (see PR 10). Say so in the review, so nobody assumes the pages are covered.
- **Editor:** open `Frontend/customer-facing-frontend` as its own VS Code folder. The repo-root window pins the Backend's TypeScript 4.9, which cannot read the
  front end's config and shows false "cannot find module" errors.

## 6. The seller portal (pull requests 11 to 19)

Work after PR 10 continues on the same branch and is split the same way: no history is rewritten, each pull request is a label on a commit and is based on the one before. `Frontend/seller-portal` is a new app, so every pull request only adds to it, and the one backend change (the invoice file name exposed over CORS) is already in the commit that needs it.

```bash
git branch pr/11-customer-clear-cart-logo     eab0f88
git branch pr/12-seller-scaffold              68a0ca6
git branch pr/13-seller-auth                  c3952cf
git branch pr/14-seller-application-status    b30ac30
git branch pr/15-seller-dashboard             1008860
git branch pr/16-seller-orders                8710565
git branch pr/17-seller-catalogue             81091bc
git branch pr/18-seller-product-form          4efa03d
git branch pr/19-seller-profile               938f4bf
git branch pr/20-seller-polish                726ad04
```

Check each one on its own, as in section 2, but from `SA_MarketPlace/Frontend/seller-portal` (Node 24+, `pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm test`).

| # | Branch (destination) | What it contains |
|---|---|---|
| 11 | `pr/11-customer-clear-cart-logo` (PR 10) | Customer app: Clear cart, the app logo and page titles, this guide |
| 12 | `pr/12-seller-scaffold` (PR 11) | Vite project, theme (orange with dark text), copied shared components, router, the plan. Every page a placeholder |
| 13 | `pr/13-seller-auth` (PR 12) | Sign-in, register, forgot and reset password, session, route guards |
| 14 | `pr/14-seller-application-status` (PR 13) | Pending, not approved (resubmit) and approved screens; the status gate |
| 15 | `pr/15-seller-dashboard` (PR 14) | Sidebar, dashboard cards, dispatch queue with SLA badges |
| 16 | `pr/16-seller-orders` (PR 15) | Orders list, fulfilment with pick list and dispatch, cancel pop-up, invoice download; supplier API exposes `Content-Disposition` |
| 17 | `pr/17-seller-catalogue` (PR 16) | Catalogue list, filters, sorting, low-stock banner, retire (price and stock read-only in the list) |
| 18 | `pr/18-seller-product-form` (PR 17) | Add and edit product, up to four images, Save draft and Publish |
| 19 | `pr/19-seller-profile` (PR 18) | Business profile, change password, sign out |
| 20 | `pr/20-seller-polish` (PR 19) | `495b60e` to `726ad04`: accessibility fixes, narrow-screen menu drawer, dispatch-queue error state, the shared pop-up layout and the unsaved-changes prompt (seller and customer), the TypeScript watch fix in the backend, `docs/browser-checklist.md`, the updated delivery report and PDF |

### Pull request text

**PR 12 to 19: Seller portal, one step each**
> The supplier-facing app, built like the customer marketplace (React 19, Vite, TypeScript, Ant Design 6, Redux Toolkit with RTK Query) with a left sidebar and the seller's orange. Each pull request is one screen group, connected to the real supplier API with no sample data.
> **Review:** `src/router`, then the page folder and store folder of the step; `docs/ui-build-plan.md` lists every screen, endpoint and each place the backend won over the designs.
> **Run:** start the supplier API (`pnpm supplier-api` in `Backend/`), then `pnpm install && pnpm dev` in `Frontend/seller-portal`; sign in as `priya@bindimedsupply.com.au` / `Password123!`.

**PR 20: Polish**
> The accessibility pass (axe clean on every page and pop-up), a menu drawer instead of an unreachable collapsed sidebar, an error state for the dispatch queue (it read "nothing to dispatch" when the request failed), a walkthrough checklist and known limitations, and the delivery report brought up to date with the seller portal.
> **Review:** `src/components/layouts/SidebarLayout`, `src/pages/BusinessProfile/components/ReadOnlyField.tsx`, `docs/browser-checklist.md`.

## 7. SA Admin (pull requests 21 to 28)

Same method: labels on commits that already exist, each based on the one before. `Frontend/admin-portal` is a new app, so every pull request only adds to it. The
one backend change (the admin API exposes `Content-Disposition` for the CSV and invoice file names) is in the scaffold commit `f01cfa1`, and the customer profile
fix found during the profile step is in `12ac9af`.

```bash
git branch pr/21-admin-scaffold               f01cfa1
git branch pr/22-admin-auth                   c79f52f
git branch pr/23-admin-supplier-queue         3ba30aa
git branch pr/24-admin-application-review     08e9c46
git branch pr/25-admin-orders-list            61be0b5
git branch pr/26-admin-order-detail           c281ae6
git branch pr/27-admin-profile                12ac9af
git branch pr/28-admin-polish                 <the commit you make for step 8>
```

Check each one on its own from `SA_MarketPlace/Frontend/admin-portal` (Node 24+, `pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm test`).

| # | Branch (destination) | What it contains |
|---|---|---|
| 21 | `pr/21-admin-scaffold` (PR 20) | `pnpm create vite`, the copied base, the purple theme, sidebar and routes with placeholder pages, the plan, the admin API's CORS header |
| 22 | `pr/22-admin-auth` (PR 21) | Sign in, create account (staff domains only), forgot and reset password, session, guards, sign out |
| 23 | `pr/23-admin-supplier-queue` (PR 22) | The verification queue: search, status chips with counts, banner, sidebar badge, empty states |
| 24 | `pr/24-admin-application-review` (PR 23) | One application, the checklist, the approve and reject pop-ups, the decided view |
| 25 | `pr/25-admin-orders-list` (PR 24) | All orders: filters, search, sort, paging, Export CSV, empty states |
| 26 | `pr/26-admin-order-detail` (PR 25) | An order's read-only detail and the invoice download |
| 27 | `pr/27-admin-profile` (PR 26) | My profile, change password, the unsaved-changes prompt; the same crash fixed in the customer profile page |
| 28 | `pr/28-admin-polish` (PR 27) | The final accessibility pass, `docs/browser-checklist.md`, the unused placeholder removed, the backend README's front-end table, the updated delivery report and PDF |

### Pull request text

**PR 21 to 27: SA Admin, one step each**
> The staff app, built like the seller portal (React 19, Vite, TypeScript, Ant Design 6, Redux Toolkit with RTK Query) with its own purple and a sidebar of Suppliers, Orders and My Profile. Each pull request is one screen group, connected to the real admin API with no sample data.
> **Review:** `src/router`, then the page folder and store folder of the step; `docs/ui-build-plan.md` lists every screen, endpoint and each of the 20 places the backend won over the designs.
> **Run:** start the admin API (`pnpm admin-api` in `Backend/`), then `pnpm install && pnpm dev` in `Frontend/admin-portal`; sign in as `a.morgan@sampleassist.com.au` / `Password123!`.

**PR 28: Polish**
> A full axe pass over every page and pop-up (clean), a keyboard and narrow-screen check, the walkthrough checklist and its known limitations, removal of the unused placeholder, the backend README's table of the three front ends, and the delivery report brought up to date with SA Admin (1,685 automated tests in all).
> **Review:** `docs/browser-checklist.md`, `Backend/docs/report`.
