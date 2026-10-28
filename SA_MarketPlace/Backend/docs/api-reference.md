# API reference

Endpoint-by-endpoint notes for the three APIs, with curl examples. Setup, ports and logins are in
the [README](../README.md); the reasoning behind each rule is in the [decision records](adr/README.md).

---

## Authentication

Email and password in, a JWT back. The shared pieces live in `packages/auth`; each app
adds its own controller and sign-up. See ADR [0017](adr/0017-jwt-auth-with-passport.md),
[0018](adr/0018-logout-via-token-version.md) and
[0019](adr/0019-per-app-audience-and-allowed-roles.md).

`JWT_SECRET` is required — `loadAppConfig()` refuses to boot if it is missing or blank.
Generate your own:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`JWT_EXPIRES_IN` defaults to `15m`.

### Endpoints — `/api/customer/v1/auth`

| Route | Token needed | What it does |
|---|---|---|
| `POST register` | no | Creates a buyer, finds or creates their organisation, returns a token |
| `POST login` | no | Checks the password, returns a token |
| `GET profile` | yes | The My Profile screen: identity, member-since date and orders placed |
| `PATCH profile` | yes | Edit `firstName` / `lastName` / `phone` only — see below |
| `POST logout` | yes | Invalidates every token issued to that user so far |
| `POST forgot-password` | no | Always the same response; emails a reset link if the account exists — see below |
| `POST reset-password` | no | Consumes the link's token, sets a new password |
| `POST change-password` | yes | Sets a new password; no current-password check — see below |

### Try it

Start the app, open `http://localhost:8001/docs`, and log in as a seeded buyer —
`j.shaw@saclinics.com.au` / `Password123!`. Copy the `access_token`, click
**Authorize**, paste it, then call `GET profile`. Call `logout` and the same token
stops working.

### My Profile

`GET profile` returns more than plain identity — the fields the My Profile screen needs:

```json
{
  "email": "j.shaw@saclinics.com.au",
  "firstName": "Jordan",
  "lastName": "Shaw",
  "phone": "0412 000 001",
  "organisationName": "SA Clinics Pty Ltd",
  "roles": ["collection_manager", "buyer"],
  "memberSince": "2026-01-14T00:00:00.000Z",
  "ordersPlaced": 3,
  "passwordLength": 12
}
```

- **`ordersPlaced` counts every order this buyer has ever placed, cancelled ones
  included** — it describes the historical event of checkout succeeding, not the order's
  current status (ADR 0027).
- **Never the password or its hash.** There is no way to recover a real password from its
  bcrypt hash, and the hash itself must never leave the backend. `passwordLength` is the
  one exception — the real character count only, so My Profile can render dots sized to
  the actual password (`••••••••••••` for 12 characters above) instead of a fixed-length
  placeholder. It's written alongside `passwordHash` at register, reset-password and
  change-password (ADR 0030).
- `packages/auth`'s own `AuthService.getProfile` stays generic (no `ordersPlaced` there);
  the enrichment is entirely in `apps/customer-facing`'s `ProfileService`, so a future
  seller or admin "My Profile" doesn't inherit a buyer-shaped response (ADR 0027).

`PATCH profile` edits it. True partial-update semantics — send only the fields you want
to change:

```bash
curl -X PATCH $BASE/auth/profile \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"firstName": "Jordan", "phone": "0412 000 099"}'
```

Returns the same shape `GET profile` does, refreshed. Three fields only —
`firstName`, `lastName`, `phone`. **`email`, `password` and `organisation` are rejected
outright with 400**, not silently dropped (ADR 0028):

- **Email** needs a re-verification flow that doesn't exist yet (CLAUDE.md open question
  #7) — accepting a change today would repoint an account's sign-in identity with no
  proof the new address belongs to that person.
- **Password** is a distinct, higher-stakes action with its own endpoint, `POST
  change-password` — see below. (Deliberately *not* gated on the current password there
  either — see that section.)
- **Organisation** is shared state other users' orders and inventory hang off; moving it
  is a bigger feature than a profile-edit field.

### Password rule

`PATTERNS.PASSWORD` in `packages/common`: **at least 8 characters, with an uppercase
letter, a lowercase letter, a number and a symbol.** Registration rejects anything else
with 400.

Any sign-up form must show exactly this, or users will follow a weaker hint and hit
errors. Suggested wording:

```
At least 8 characters, including an uppercase letter, a lowercase letter, a number and a symbol.
```

### Forgot / reset password

```bash
curl -X POST $BASE/auth/forgot-password -d '{"email": "j.shaw@saclinics.com.au"}'
# {} 200 — same response whether or not that email has an account (ADR 0029)
```

**There is no real email provider in this project.** `MailService` (`packages/common`)
logs the message instead of sending it — start the app with `pnpm dev` and watch the
terminal for a line starting `[mock email]`. Copy the `token=...` value out of the
logged link:

```bash
curl -X POST $BASE/auth/reset-password \
  -d '{"token": "<paste it here>", "password": "NewPassw0rd!"}'
```

- **Same rule for the new password** as registration — see above.
- **The token is single-use** and expires after `PASSWORD_RESET_TOKEN_TTL_MINUTES`
  (default 30). Reusing it, or a garbage token, or an expired one, all produce the
  identical `This reset link is invalid or has expired` (`ECB001`) — the response never
  reveals which case occurred.
- **Requesting a new link invalidates the previous, unused one.** Only the most recently
  requested link for an account ever works.
- **A successful reset signs the account out everywhere**, the same as `logout` — every
  token issued before the reset stops working immediately, not just on the device that
  did the reset.
- **Works regardless of role.** One account has exactly one password (§4.1), so this
  isn't gated to buyers the way login is — resetting through the customer app's endpoint
  works for the account no matter which surface it also signs into.

Full reasoning: [ADR 0029](adr/0029-password-reset-tokens.md).

### Change password

The My Profile screen's "Change Password" section — distinct from forgot/reset-password,
which is for a signed-out user who can't get in at all.

```bash
curl -X POST $BASE/auth/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"newPassword": "NewPassw0rd!"}'
# { "access_token": "<new token>" } 200
```

- **No `currentPassword` field, and none is checked.** The design shows the current
  password as a static dots display, not an input — there is nothing for the user to type
  for the backend to verify. The JWT alone authorizes the change. This is a deliberate,
  confirmed trade-off, not an oversight: a hijacked or left-open session can change the
  password with no extra proof. Full reasoning: [ADR 0030](adr/0030-change-password.md).
- **No `confirmPassword` field either** — matching "New password" against "Confirm new
  password" is purely a frontend concern, same as registration. Sending either extra field
  gets rejected with `property ... should not exist` (400).
- **Same password rule as registration.**
- **Setting the same password again is rejected** (`New password must be different from
  the current password`) — still checked against the stored hash even though the caller
  never proved they know it.
- **Every other session is ended, the same as logout** — but unlike reset-password, the
  response hands back a **fresh `access_token`** so the session that made the change
  keeps working. The old token (the one the request itself was authorized with) stops
  working immediately; swap to the new one right away.

### Seller portal auth — `/api/supplier/v1/auth`

`pnpm supplier-api` starts `apps/supplier-api` on port **8002** (Swagger at
`http://localhost:8002/docs`). Same shared `AuthService`, with audience `supplier` and
only the `seller` role allowed to sign in — a buyer gets 403 here, and a seller gets 403
on the customer API.

| Route | Token needed | What it does |
|---|---|---|
| `POST register` | no | Creates a seller and their pending supplier profile, returns a token |
| `POST login` | no | Same as customer login |
| `POST forgot-password` | no | Identical to the customer one |
| `POST reset-password` | no | Identical to the customer one |
| `POST logout` | yes | Invalidates every token issued to that seller so far |
| `GET profile` | yes, approved | The Business Profile screen (see below) |
| `PATCH profile` | yes, approved | Save changes on that screen |
| `POST change-password` | yes | New password only; returns a fresh token (see below) |

Register, login, forgot-password, reset-password and change-password are rate limited per IP like the
customer API (`AUTH_THROTTLE_LIMIT` / `AUTH_THROTTLE_TTL`, default 5 a minute), and over
the limit returns 429 `ECB429`.

`register` takes what the Signup screen collects:

```bash
curl -X POST http://localhost:8002/api/supplier/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Acme Supplies Pty Ltd",
    "abn": "51824753556",
    "businessType": "Wholesaler",
    "contactName": "Jamie Lee",
    "email": "jamie@acme.com.au",
    "password": "Sup3rSecret!",
    "phone": "0400 111 222",
    "confirmAuthorised": true
  }'
# { "access_token": "<token>" } 201
```

- **The supplier starts as `pending_review`.** Approval is an admin action, never
  something registering sets. Pending (and later rejected) sellers can still sign in —
  the frontend routes them to the "under review" screen from their supplier status.
- **`abn` is checksum-validated** (`@IsAbn()` in `packages/common`, the same algorithm
  `db:verify` checks the seed against), not just 11 digits.
- **`contactName` must be a full name.** It is split on the last space into first and
  last name — "Jamie van der Lee" becomes first name "Jamie van der", last name "Lee" — and
  each part can be at most 100 characters (longer is a 400, not a server error).
- **Password follows the backend rule** (see "Password rule" above), not the weaker hint
  shown in the design. There is no `confirmPassword` field; sending one is rejected.
- **`businessType` is optional**; `phone` is required.
- **"Role / title" and "Product categories" are on the form but not accepted** — neither
  has a column or table in the data model, so they are rejected as unknown fields until
  that is designed.
- **"Keep me signed in" has no backend yet** — tokens still last 15 minutes.

Full reasoning: [ADR 0031](adr/0031-seller-registration.md).

### Seller application status — `/api/supplier/v1/application`

What a seller sees after signing up: under review, approved, or not approved. Signed-in
sellers only, and a pending or rejected seller is allowed in — these routes are how they
see where they stand. The seller is always taken from the token, never from a URL.

| Route | What it does |
|---|---|
| `GET /` | The status screen: one of three shapes, told apart by `status` |
| `POST /acknowledge` | "Proceed to dashboard" — approved only, 204, safe to repeat |
| `GET /details` | Pre-fill data for "Update and resubmit" — rejected only |
| `PUT /` | Update and resubmit — rejected only, goes back to `pending_review` |

`GET /` returns, by status:

```json
{ "status": "pending_review", "businessName": "...", "abn": "51824753556", "submittedAt": "..." }
{ "status": "rejected", "businessName": "...", "rejectionReason": "...", "reviewedAt": "...",
  "supportContact": { "email": "partners@sampleassist.com.au", "phone": null } }
{ "status": "approved", "businessName": "...", "approvedAt": "...", "acknowledged": false }
```

- **`acknowledged` decides which screen to show.** `false` shows the "you're approved"
  notice; `true` goes straight to the dashboard. `POST /acknowledge` sets it, stored on the
  supplier profile, so the notice never shows again on any device. Repeating the call keeps
  the original time.
- **Under review has no push.** The seller sees a new decision the next time the frontend
  calls `GET /` — after signing in again, once their token has expired.
- **The ABN is returned raw** (`51824753556`); the "51 824 753 556" spacing is formatting.
- **Support contact is configuration, not an endpoint.** `SUPPORT_EMAIL` (default
  `partners@sampleassist.com.au`) and `SUPPORT_PHONE`, both read from `.env`. Leave
  `SUPPORT_PHONE` blank and `phone` is `null`, so the frontend hides the hotline line.
- **`PUT /` takes the registration form minus `email` and `password`.** `GET /details`
  returns the sign-in email for display, but sending `email` or `password` is rejected —
  changing a sign-in email needs a re-verification flow that does not exist yet, and a
  password change has its own endpoint. It re-validates the ABN, and clears the previous
  rejection reason and review date. The application and the seller's name and phone are
  saved in one transaction, so a failure leaves both unchanged.
- **Resubmitting is safe against races.** Two quick submits, or one racing an admin
  decision, cannot both succeed — the second is a 409.
- A seller with no supplier profile gets 404. Anything not allowed for the current status
  (acknowledging while pending, resubmitting while approved) is a 409.

Full reasoning: [ADR 0032](adr/0032-seller-application-status.md).

### Seller dashboard — `/api/supplier/v1/dashboard`

The first screen a seller reaches once approved. **Approved sellers only**: a pending or
rejected seller gets 403 `Your supplier application has not been approved yet` (they use
`/application` instead). The seller always comes from the token, never a URL or body, so
one seller can never see another's data.

| Route | What it does |
|---|---|
| `GET overview` | The three cards, plus the number for the Catalogue badge |
| `GET orders-requiring-dispatch` | The "Orders requiring dispatch" table, paged |

`GET overview` returns:

```json
{
  "businessName": "Bindi MedSupply Pty Ltd",
  "newOrders": 1,
  "dispatchedToday": 0,
  "activeListings": 28,
  "listingsNeedingAttention": 4
}
```

- **All zeros is a normal answer** — the frontend shows the empty-state welcome.
- **`newOrders`** is orders in `placed` or `confirmed`; **awaiting dispatch** (the table)
  also includes `picking`. Dispatched, delivered and cancelled are no longer the seller's to act on.
- **`dispatchedToday` counts orders** dispatched today, where today is the calendar day in
  the *seller's own timezone* (`supplier_profile.timezone`, default `Australia/Sydney`).
  Times are stored as UTC; Postgres works out that day's start and end as UTC instants
  (ADR 0033), so a dispatch at 8 am Sydney time counts as today.
- **`activeListings`** is published products. **`listingsNeedingAttention`** is the published
  ones at or below their low-stock threshold (low stock or out of stock) — also the badge on
  Catalogue. Draft and retired listings never count.

`GET orders-requiring-dispatch` takes the same `page` / `limit` (10, 20 or 30) as My Orders:

```json
{
  "data": [{
    "orderNumber": "ORD-2026-00125",
    "organisationName": "Mining Co Pty Ltd",
    "placedAt": "2026-08-28T22:20:00.000Z",
    "itemCount": 5,
    "slaDueAt": "2026-08-29T22:20:00.000Z",
    "slaHoursLeft": -868
  }],
  "pagingMeta": { "page": 1, "limit": 10, "totalItem": 2, "totalPage": 1,
                  "hasPreviousPage": false, "hasNextPage": false }
}
```

- **Oldest first by default** — the one closest to breaching its SLA. `order=DESC` reverses
  it; `orderField` only accepts `placed_at`.
- **`itemCount` is units**, summed across the order's lines: two lines of 2 and 3 is 5.
- **`slaHoursLeft` is rounded up and negative once overdue.** The SLA is the seller's
  `dispatch_sla_hours` counted in plain hours from when the order was placed. The frontend
  chooses the badge colour. Seeded orders are weeks old, so seeded rows show large negatives.
- **`organisationName` is `null`** for a buyer with no organisation.

Full reasoning: [ADR 0034](adr/0034-seller-dashboard.md).

### Seller catalogue — `/api/supplier/v1/catalogue`

Approved sellers only, and a seller only ever sees and changes their own products (another
seller's product is a 404, the same as a missing one).

| Route | What it does |
|---|---|
| `GET /` | The catalogue table: filter, search, sort, page, plus the low-stock banner |
| `GET categories` | Categories with their sub-categories, for the Category and Sub-category dropdowns |
| `GET :productId` | One product as the edit form needs it |
| `POST /` | Add a product (Save draft or Publish), with up to 4 images |
| `PATCH :productId` | Edit a product: any fields, add images, remove images |
| `POST :productId/retire` | Retire a product: off sale for good, kept for history |

`GET /` takes `status` (`draft`, `published`, `retired`; leave out for All), `search` (name or
SKU), `orderField` (`name`, `price`, `quantity`; default `name`), `order` and the usual `page` /
`limit`. It returns the rows, `pagingMeta`, and `lowStock`: published products at or below their
threshold, least stock first. **`lowStock` ignores the filter and page**, so the banner shows on
every tab. Draft and retired products never appear in it.

**Draft or published.** Send `listingStatus`: `draft` for Save draft (the default) or `published`
for Publish. `retired` is refused. A published product needs a description. On an edit, Save draft
on a published product unpublishes it, and clearing the description is refused unless the same
request moves it to draft. Published products from an approved seller are visible to buyers at
once.

**Add a product** (multipart, so the images go in the same request):

```bash
curl -X POST http://localhost:8002/api/supplier/v1/catalogue \
  -H "Authorization: Bearer $TOKEN" \
  -F name="Hair Follicle Test Kit" -F sku=HFT-003 -F price=89 \
  -F categoryId=<id from GET categories> -F quantity=12 -F lowStockThreshold=20 \
  -F description="Collection kit for extended-window testing" \
  -F listingStatus=published \
  -F images=@main.jpg -F images=@second.png
```

- **Required:** `name`, `sku`, `price`, `categoryId`. Everything else is optional. Stock and
  threshold default to 0.
- **`categoryId` is the sub-category if one is chosen, else the category.** `GET :productId` splits
  it back into `category` and `subCategory`.
- **`price` is GST-inclusive, above 0, at most two decimals**, kept as a string and returned
  padded (`"89"` comes back `"89.00"`).
- **JSON works too** when there are no images. On create, a blank optional field counts as not sent.
- **`sku` is unique per seller**, across every status. A clash is 409
  `You already have a product with this SKU`.

**Images.** At most 4 per product, 5 MB each, JPEG, PNG or WebP, decided from the file's own
bytes (a text file named `.jpg` is refused). The order sent is the display order and **the first
is the primary image**. Files are saved to `Backend/storage/products/` (gitignored) under a random
name; `path` is relative (`products/<random>.jpg`). Both APIs serve them publicly:

```
http://localhost:8002/media/products/<random>.jpg     (also on :8001)
```

So an image's URL is `/media/` plus its `path`. Any failure while saving rolls back the product
and removes the files written, so there is never a product missing its images or a stray file.

**Edit a product** (`PATCH`, JSON or multipart). **Send only what changed.** Fields you leave out
are untouched, so a stock count that sold since the form opened is not overwritten.

- A blank text field (`brand=`) **clears** it, unlike create.
- `price` or `quantity` alone is a valid edit; the table's inline cells use the same route.
- To add images attach new `images` files. To remove, send `removeImageIds` (a repeated field in
  multipart). The cap is 4 in total after both. The next image is promoted to primary when the
  primary is removed. There is no reorder.
- A retired product cannot be edited: 409 `Retired products cannot be edited`.
- An empty body is accepted and changes nothing.

**Retire a product** (`POST :productId/retire`, no body). It takes a product off sale for good
without deleting it, and returns the product with `listingStatus: "retired"`:

```bash
curl -X POST http://localhost:8002/api/supplier/v1/catalogue/<productId>/retire \
  -H "Authorization: Bearer $TOKEN"
```

- Allowed from draft or published. **It cannot be undone**: a retired product is read-only, cannot
  be published again, and keeps its SKU reserved. Send Save draft instead for a reversible pause.
- A second retire is 409 `This product is already retired`. Two at once: one wins.
- **Buyers** stop seeing it; a cart holding it shows "This product is no longer available" and
  checkout refuses it. It no longer counts in the dashboard's listings or the low-stock banner.
- **Nothing is deleted**: images, stock and the SKU stay, and it remains in the table under the
  Retired chip. **Orders already placed are not affected**: they can still be dispatched or
  cancelled (a cancel returns the units to the product's stock).

| Problem | Response |
|---|---|
| Another seller's or unknown product | 404 `Product not found` |
| `categoryId` that does not exist | 400 `Category not found` |
| A file that is not a JPEG, PNG or WebP | 400 `Images must be JPEG, PNG or WebP` |
| More than 4 images | 400 `Attach up to 4 images in the "images" field` (create) / `A product can have at most 4 images` (edit) |
| An image over 5 MB | 413 `Each image must be 5 MB or smaller` |
| `removeImageIds` not on this product | 400 `One of the images to remove does not belong to this product` |
| Publishing with no description | 400 `A description is required to publish` |

Tests: `pnpm test:e2e` runs `catalogue.e2e-spec.ts` (118 tests). It builds its own sellers and
products, removes them and their image files afterwards, and swaps `storage/products` aside for
the file-write failure test rather than deleting it.

Not built yet: reordering images, choosing the primary image, and a read-only screen for retired products. The seeded products'
image paths point at files that do not exist, so those URLs 404; products created here are fine.
Full reasoning: [ADR 0035](adr/0035-seller-catalogue.md).

### Seller orders — `/api/supplier/v1/orders`

Approved sellers only. A seller only ever sees and acts on their own orders: another seller's
order is a 404, the same as a missing one. Order numbers must look like `ORD-2026-00123`.

| Route | What it does |
|---|---|
| `GET /` | The orders table: filter by status, search, sort, page |
| `GET :orderNumber` | One order: pick list, delivery address, dispatch details |
| `POST :orderNumber/dispatch` | Record a carrier and tracking number and mark it dispatched |
| `POST :orderNumber/cancel` | Cancel an order the seller cannot fulfil |
| `GET :orderNumber/invoice` | Download the tax invoice PDF |

**Statuses.** The seller sees five: `new` (the backend's `placed` and `confirmed`), `picking`,
`dispatched`, `delivered`, `cancelled`. `GET /` takes `status` as one of those; leave it out for
All. It also takes `search` (part of the order number), `orderField` (`placed_at` or `total`,
default `placed_at`), `order` (default `DESC`, newest first) and the usual `page` / `limit`. Each
row has `itemCount` (units, not lines), `total` and `canDownloadInvoice`.

**The detail** (`GET :orderNumber`) returns `items` (the pick list, by product name), `delivery`
(the address), `dispatch` (carrier, tracking, times and the seller's `defaultCarrier` to prefill
the form), `cancellationReason`, and two flags the buttons use: `canDispatch` (new or picking) and
`canDownloadInvoice` (dispatched or delivered). A carrier or tracking number that is on file is
**hidden until the order has gone out**.

**Dispatch**:

```bash
curl -X POST http://localhost:8002/api/supplier/v1/orders/ORD-2026-00127/dispatch \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "carrierName": "Australia Post", "trackingNumber": "AP123456789" }'
```

- **Only `carrierName` and `trackingNumber`.** The server sets `dispatchedAt` (now) and
  `estimatedDeliveryAt` (three days on, the same figure checkout uses); sending either is a 400.
- A carrier is matched by name ignoring case and extra spaces, and created if it is new.
- Allowed while the order is new or picking. Otherwise 409 `Cannot fulfil this order`. Two
  simultaneous dispatches (or a dispatch racing a cancel) cannot both win.
- It does not touch stock or payment.

**Cancel** (the "cannot fulfil" action):

```bash
curl -X POST http://localhost:8002/api/supplier/v1/orders/ORD-2026-00127/cancel \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "reason": "other", "notes": "Supplier recall" }'
```

- `reason` is `out_of_stock`, `cannot_meet_sla`, `pricing_error` or `other`. `notes` are
  optional, required for `other`, and at most 500 characters. The stored reason (shown to the
  buyer) is the label plus notes: `Other: Supplier recall`.
- In one transaction it marks the order cancelled, **gives each line's units back to the
  product's stock**, and marks a **paid** payment `refunded` (pending or failed payments are left
  alone). Afterwards it emails the buyer. The mail is a log line and no money moves.
- Allowed while the order is new or picking, and final once done. Otherwise 409
  `This order can no longer be cancelled`; stock is returned once however often it is called.

**Invoice.** `GET :orderNumber/invoice` returns the PDF as an attachment
(`ORD-2026-00127-invoice.pdf`). It is **the same document the buyer downloads**: the first
download from either side generates it and stores it under `storage/invoices/`, and every later
one serves that file. Seller and buyer details are copied onto the invoice when it is issued, so
renaming the business later does not change it. Two simultaneous first downloads produce one
invoice. Before dispatch it is 409 `The invoice is not available until this order has dispatched`.

Tests: `pnpm test:e2e` runs `orders.e2e-spec.ts` (90 tests). It creates its own sellers, products,
orders, carriers and invoices, and removes them (and the PDFs) afterwards.

Picking is a screen step, not a stored status: a new order stays `new` until it is dispatched, and
the order screen shows *Picking & Packing* while it is new (so the table's `status=picking` filter
returns nothing for real orders). Not built yet: marking an order `delivered`, and the buyer's shelf
stock growing on receipt. Full reasoning: [ADR 0036](adr/0036-seller-orders.md).

### Seller business profile — `/api/supplier/v1/auth/profile`

The Business Profile screen, built like the customer app's My Profile. **`GET` and `PATCH` are
for approved sellers only** (a pending or rejected seller gets 403 and uses `/application`
instead). `change-password` works for any signed-in seller.

`GET profile` returns one shape, which `PATCH` returns too:

```json
{
  "business": { "businessName": "Bindi MedSupply Pty Ltd", "abn": "51824753556", "businessType": "Medical consumables wholesaler" },
  "contact": { "contactName": "Priya Nair", "phone": "0412 000 002" },
  "productCategories": ["Chain of Custody", "Collection Kits", "Rapid Tests", "Supplies"],
  "email": "priya@bindimedsupply.com.au",
  "passwordLength": 12,
  "fulfilment": { "dispatchSlaHours": 24, "defaultCarrier": "Australia Post" },
  "verification": { "status": "approved", "approvedAt": "2026-06-02T03:00:00.000Z" }
}
```

`passwordLength` is only the length, so the screen can draw the current password as dots; the
password and its hash are never returned. `verification` is the "Verified supplier" line.

**Save changes** (`PATCH profile`) takes any of these, and only what is sent changes:

```bash
curl -X PATCH http://localhost:8002/api/supplier/v1/auth/profile \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "contactName": "Priya Q Nair", "phone": "0411 222 333", "dispatchSlaHours": 24, "defaultCarrier": "Sendle" }'
```

| Field | Rule |
|---|---|
| `businessType` | up to 100 characters; blank clears it |
| `contactName` | a full name (two words or more), first and last part each at most 100 characters |
| `phone` | not blank, up to 32 characters |
| `dispatchSlaHours` | a whole number from 1 to 168 |
| `defaultCarrier` | up to 100 characters; blank clears it. Free text that only prefills the dispatch form |

- **Business name, ABN and email are shown but not editable**: an admin verified the first two,
  and the email is the sign-in identity. Sending them (or a password or status) is a 400
  `property … should not exist`. The frontend shows them read-only.
- An empty body is accepted and writes nothing. The user and business parts are saved together or
  not at all.
- **The SLA reaches the dashboard immediately, for orders already waiting too**: each deadline is
  the order's placed time plus the seller's current SLA.
- **`productCategories` is read-only** and worked out from the seller's products (sub-categories rolled up to
  their top-level category, retired products ignored); `PATCH` rejects it. "Role / title" is on the screen but
  not in the API (no column).

**Change password** (`POST change-password`) takes **only `newPassword`**, like the customer app
(ADR 0030): the screen shows the current password as dots and only the new one is typed.

```bash
curl -X POST http://localhost:8002/api/supplier/v1/auth/change-password \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "newPassword": "NewPassw0rd!" }'
# { "access_token": "<fresh token>" }
```

It follows the backend password rule, refuses the same password (400), signs out every other
session, and returns a fresh token so this one carries on. `currentPassword` and `confirmPassword`
are rejected. It is rate limited. Sign out is the existing `POST logout`.

Tests: `pnpm test:e2e` runs `profile.e2e-spec.ts` (53 tests) and adds a change-password case to the
rate-limit spec. The profile spec checks the seeded login reports `passwordLength` 12.

Full reasoning: [ADR 0037](adr/0037-seller-business-profile.md) and
[ADR 0040](adr/0040-product-categories-from-products.md) (the categories).

### Admin auth — `/api/admin/v1/auth`

`pnpm admin-api` starts `apps/admin-api` on port **8003** (Swagger at `http://localhost:8003/docs`).
Same shared `AuthService`, with audience `admin` and only the `admin` role allowed to sign in: a
seller or buyer gets 403 here, and an admin token is refused by the other two apps.

| Route | Token needed | What it does |
|---|---|---|
| `POST register` | no | Creates an admin from an allowed email domain, returns a token |
| `POST login` | no | Same as the other apps |
| `POST forgot-password` | no | Identical to the customer one |
| `POST reset-password` | no | Identical to the customer one |
| `POST logout` | yes | Invalidates every token issued to that admin so far |
| `GET profile` | yes, admin | The My Profile screen (see below) |
| `PATCH profile` | yes, admin | Save changes on that screen (the name only) |
| `POST change-password` | yes, admin | New password only; returns a fresh token (see below) |

Register, login, forgot-password, reset-password and change-password are rate limited per IP, like the other apps.

```bash
curl -X POST http://localhost:8003/api/admin/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Alex Morgan",
    "email": "alex.morgan@sampleassist.com.au",
    "password": "Sup3rSecret!",
    "acceptTerms": true
  }'
# { "access_token": "<token>" } 201
```

- **Only emails at an allowed domain can register.** `ADMIN_EMAIL_DOMAINS` is a comma-separated list
  (default `sampleassist.com.au`). The match is exact, so look-alikes and subdomains are refused, and an
  empty value allows nobody. An address outside the list is always 400 `Admin accounts are only available
  to Sample Assist staff email addresses`, whether or not it has an account elsewhere.
- **There are no invitations.** The design's invitation code is gone, and so is the `admin_invite` table.
- **This is a speed bump, not a lock.** Nothing verifies the mailbox, so anyone can type a
  `@sampleassist.com.au` address. Fine for local Phase 1 with fake data; replace it before real use
  (ADR 0038).
- **`acceptTerms` must be `true`** (the "I agree" tick, stored as `terms_accepted_at`) even though the
  design has no checkbox for it.
- **`fullName` is split on the last space** into first and last name, each at most 100 characters, so
  "Mary Jane van der Berg" becomes "Mary Jane van der" and "Berg".
- **Password follows the backend rule** (see "Password rule" above), not the weaker hint in the design.
  There is no `confirmPassword`; sending one is rejected, as is any unknown field such as `role`.
- **A taken email is 409**, including when two registrations race: one wins.
- A new admin is active at once, with the `admin` role, no phone and no organisation.
- "Keep me signed in" has no backend yet: tokens last 15 minutes.

#### Admin My Profile

`GET profile` returns one shape, which `PATCH` returns too:

```json
{
  "fullName": "Alex Morgan",
  "email": "a.morgan@sampleassist.com.au",
  "roles": ["admin"],
  "passwordLength": 12,
  "memberSince": "2026-01-14T00:00:00.000Z",
  "lastSignInAt": "2026-10-10T09:14:00.000Z"
}
```

- **`passwordLength`** is only the length, so the screen can draw the current password as dots; the password
  and its hash are never returned.
- **`memberSince`** is "Admin since" (the account's created date). **`lastSignInAt`** is the latest sign-in
  recorded: it is set when an admin signs in or registers, not by a wrong password or by changing the password,
  and it is `null` until the first one. Only the admin app records it.
- **`PATCH profile`** takes only `fullName` (two words or more, each part at most 100 characters), split on the
  last space. Email, role, password and dates are rejected with 400 `property … should not exist`. An empty body
  writes nothing.
- **`POST change-password`** takes **only `newPassword`**, like the other apps (ADR 0030): the screen shows the
  current password as dots and only the new one is typed. It follows the backend password rule, refuses the same
  password, signs out every other session and returns a fresh token. `currentPassword` and `confirmPassword` are
  rejected.
- All three need an admin token; a token that is for this app but lacks the admin role gets 403.

Tests: `pnpm test:e2e` runs `auth.e2e-spec.ts` (42 tests), `profile.e2e-spec.ts` (43), `auth-throttle.e2e-spec.ts`
(7), `suppliers.e2e-spec.ts` (64), `orders.e2e-spec.ts` (96) and the app spec (9) for the admin app; the domain rule also has 19 unit tests. The specs forge tokens to prove
other audiences and roles are refused. Full reasoning: [ADR 0038](adr/0038-admin-auth.md) and
[ADR 0039](adr/0039-admin-profile.md).

### Admin supplier verification — `/api/admin/v1/suppliers`

Admin only (a token for this app without the admin role gets 403). The verification table, the application
screen and the Approve and Reject modals.

| Route | What it does |
|---|---|
| `GET /suppliers` | The table. Query: `status` (`pending_review`, `approved`, `rejected`; leave out for All), `search` (business name, or the ABN with or without spaces), `page`, `limit` (10, 20 or 30), `orderField` (`queue` default, `business_name`, `submitted_at`) and `order` |
| `GET /suppliers/summary` | `{ all, pendingReview, approved, rejected }` for the tabs, the banner and the sidebar badge; it ignores filters and pages |
| `GET /suppliers/:supplierId` | The application screen, for **Review** (pending) and **View** (decided) alike |
| `POST /suppliers/:supplierId/approve` | Approve a pending application; returns the refreshed detail |
| `POST /suppliers/:supplierId/reject` | Reject it with `{ "reason": "abn_not_verified", "detail": "optional" }`; returns the refreshed detail |

- **The default order is the review queue**: pending first, longest waiting first, then decided ones with the
  latest decision first. The frontend works out "Waiting N days" from `submittedAt`.
- **The detail** has the business (name, ABN, type), the contact (name, email, phone), `productCategories`,
  `status`, `submittedAt`, `reviewedAt`, `rejectionReason` and `reviewedByName`. It never has a password or
  hash. The frontend turns the Reject and Approve buttons off when `status` is not `pending_review`.
- **`productCategories` comes from the supplier's products** (ADR 0040), so it is empty for a pending
  application. "Role / title" has no data (ADR 0031).
- **Reject reasons**: `abn_not_verified`, `business_details_incomplete`, `not_eligible_supplier` and `other`
  (which needs a `detail`). The seller reads the stored text, "ABN could not be verified. <detail>", on their
  Rejected screen.
- **Deciding twice is a 409**, including two admins clicking at once (one wins). An unknown id is 404, a
  malformed one 400. Both decisions email the contact, through the mock mailer that only logs.
- **A rejected seller who resubmits** is back in the queue as pending, with the earlier reason cleared.

```bash
curl -X POST http://localhost:8003/api/admin/v1/suppliers/$SUPPLIER_ID/reject \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "reason": "business_details_incomplete", "detail": "Please add your business type." }'
```

Tests: `suppliers.e2e-spec.ts` (64 tests) builds its own suppliers and products and never touches the seeded
ones. Full reasoning: [ADR 0041](adr/0041-admin-supplier-verification.md).

### Admin orders — `/api/admin/v1/orders`

Admin only, read-only: an admin sees every order and can change none of them (fulfilment is the supplier's job).

| Route | What it does |
|---|---|
| `GET /orders` | The All orders table. Query: `payment` (`pending`, `paid`, `failed`, `refunded`), `fulfilment` (`received`, `picking`, `dispatched`, `delivered`, `cancelled`), `search` (order number, customer organisation or buyer name), `page`, `limit` (10, 20 or 30), `orderField` (`placed_at` default, `total`, `order_number`) and `order` |
| `GET /orders/:orderNumber` | The order detail screen |
| `GET /orders/:orderNumber/invoice` | The tax invoice PDF, the same stored document the buyer and seller get |
| `GET /orders/export` | The table as a CSV file, with the same filters and sort and no paging |

- **A row** has `orderNumber`, `customerName` (the organisation, or the buyer's own name if none),
  `supplierName`, `placedAt`, `total`, `payment` (`{ status, method }`, or `null` with no payment row) and
  `fulfilment`. The screen draws "Paid (mock)" from `paid` plus `card_mock`.
- **The detail** adds the items (name, SKU, quantity, line total), subtotal, GST and total, the delivery
  address, the carrier, tracking number and dates once dispatched, a `cancellationReason`, and
  `canDownloadInvoice`. That is true only once the order is dispatched or delivered; the invoice route
  answers 409 before. The frontend disables the button until it is true.
- **Fulfilment** is the same vocabulary the seller app uses: "received" here is the seller's "new" (placed
  and confirmed). The mapping lives once, in `packages/common`.
- **Export CSV** streams the file as it is read, so it never sits in memory or on disk. Columns: order
  number, customer, supplier, placed (UTC), total (GST incl.), payment status, payment method, fulfilment.
  Dates are ISO 8601 UTC. It is a spreadsheet-safe CSV: quoted properly, with a byte order mark so Excel
  shows accents, and any cell that would start a formula (`=`, `+`, `-`, `@`) is defused with a leading
  apostrophe. Only orders placed before the export began are included.
- **The cap.** An export over `ORDER_EXPORT_MAX_ROWS` rows (default 10,000, optional in `.env`) is a 400
  asking the admin to narrow the filters, sent before any file. The table has no cap.

```bash
curl -H "Authorization: Bearer $TOKEN" -o orders.csv \
  "http://localhost:8003/api/admin/v1/orders/export?payment=paid&fulfilment=delivered"
```

Tests: `orders.e2e-spec.ts` (96 tests) builds its own suppliers, customers and orders and never touches the
seeded ones; the CSV helper has 25 unit tests. Full reasoning: [ADR 0042](adr/0042-admin-orders-and-csv-export.md).

### Rules worth knowing

- **Tokens last 15 minutes** and there is no refresh token yet: log in again.
- **A token only works on the app that issued it** (`aud`), and only roles listed for that
  app may log in there — a seller signing in on the customer API gets 403.
- **Logout signs the user out on every device**, because the counter is per user.
- **Suspended accounts are refused** at login and on the next request they make.
- **Consent is recorded.** Sign-up requires `acceptTerms: true` and stores the server-side
  time in `user.terms_accepted_at`. Seeded accounts have it null.
- **Login and register are rate limited** to 5 requests a minute per IP, counted in memory.
  Over that returns 429 with the code `ECB429`. Tune with `AUTH_THROTTLE_LIMIT` and
  `AUTH_THROTTLE_TTL` (seconds); both are optional.
- **Login returns 401 for a missing field**, not 400: guards run before the validation pipe.
- **Each app's reset email links to its own frontend.** `CUSTOMER_RESET_URL`, `SUPPLIER_RESET_URL` and
  `ADMIN_RESET_URL` (defaults `http://localhost:5173`, `:5174` and `:5175` plus `/reset-password`) hold the
  page; the token is added as `?token=…`, to any query the URL already has. A value that is not an
  http(s) URL is logged and replaced by the default, never an error, because forgot-password must answer
  the same for every email. The old shared `PASSWORD_RESET_URL` is no longer read.

The end-to-end suite covers all of this:

```bash
pnpm test:e2e
```

It creates its own users with timestamped emails, deletes them afterwards, and never
modifies the seeded accounts.

The three apps' suites run one app at a time (`--concurrency=1`) with a 30 second hook timeout. Run
together, around forty Jest workers open their own database pools, run out of connections, and time out
in `beforeAll`; a suite that times out never cleans up, so it leaves test rows behind (`pnpm db:seed`
resets them).

---

## Shop: catalogue, cart and checkout

Three modules, in the order a buyer moves through them. All require sign-in (ADR 0021) —
there is no anonymous browsing.

### Catalogue — `/api/customer/v1/products`

| Route | What |
|---|---|
| `GET products` | Search, filter by `categoryId` / `priceRange` (`under_20`, `20_to_50`, `over_50`), sort, paged |
| `GET products/categories` | The filter chips |
| `GET products/:productId` | The detail page |

Only **published** listings from **approved** suppliers are ever returned (§5) — a draft,
a retired product, or a listing from a supplier still pending review is invisible here, at
the cart, and at checkout, all from the same shared rule (`isProductOrderable`).

### Cart — `/api/customer/v1/cart`

One cart per buyer, created on first use.

| Route | What |
|---|---|
| `GET cart` | Live prices, a summary (`itemCount`, `total`, `gstIncluded`), and `unavailableReason` on any line that can no longer be ordered |
| `POST cart/items` | Add a product, or add to the quantity already there |
| `PATCH cart/items/:productId` | Set the quantity to an exact value; `0` removes the line |
| `DELETE cart/items/:productId` | Remove one line |
| `DELETE cart` | Empty it |

Stock is checked here, but only as a courtesy — it is re-checked, atomically, at checkout.

### Checkout — `POST /api/customer/v1/checkout`

```json
{
  "delivery": { "streetAddress": "12 Test St", "suburb": "Parramatta", "state": "NSW", "postcode": "2150" },
  "payment": { "method": "card_mock", "card": { "number": "4242424242424242", "expiryMonth": 12, "expiryYear": 2030, "cvc": "123", "nameOnCard": "Sam Chen" } }
}
```

Payment is mocked — see ADR 0024. Try it with:

| Card number | Result |
|---|---|
| `4242 4242 4242 4242` | Approved |
| `4000 0000 0000 0002` | Declined, 402 |

Or set `"payment": { "method": "invoice_on_account" }` and drop `card` entirely.

**A cart with products from more than one supplier becomes more than one order** — one per
supplier (CLAUDE.md §4.3), each with its own order number, delivery estimate and payment
row, sharing one payment reference. The response's `orders` array always reflects this: a
single-supplier cart returns one entry, a mixed cart returns several. Prices, product name
and SKU are frozen onto each order the moment it is placed — a later price change on the
product never touches an existing order.

The end-to-end suite places and then removes real orders, restoring the exact stock it
consumed:

```bash
pnpm test:e2e
```

**Invoices:** `GET orders/:orderNumber/invoice` downloads the tax invoice PDF — see
below.

---

## My Orders — order history

`/api/customer/v1/orders`. Both routes only ever return the signed-in buyer's own orders.

| Route | What |
|---|---|
| `GET orders` | Paged order history. Filter with `status` and `search` (part of the order number, e.g. `00123`), sort with `orderField` (`placed_at` default, or `total`) and `order` (`DESC` default — newest first). Each row is a summary: item names and quantities, no prices. |
| `GET orders/:orderNumber` | One order's full detail: priced line items, subtotal/GST/total, delivery address, carrier and tracking, and the payment view. |
| `POST orders/:orderNumber/reorder` | Adds this order's items back into the cart, at **current** prices and stock — see below. |
| `GET orders/:orderNumber/invoice` | Downloads the tax invoice PDF — see below. |

```bash
curl $BASE/orders?status=placed&limit=10 -H "Authorization: Bearer $TOKEN"
curl $BASE/orders/ORD-2026-00123 -H "Authorization: Bearer $TOKEN"
curl -X POST $BASE/orders/ORD-2026-00123/reorder -H "Authorization: Bearer $TOKEN"
```

**Another buyer's order looks exactly like a missing one** — both return 404 `ECB404`,
never 403 (ADR 0025). This also means `:orderNumber` alone is enough; there is no
`buyerId` to pass or spoof.

**Carrier, tracking number and dispatch date are `null` until a supplier actually
dispatches the order** — that happens in the seller portal, which does not exist yet.
Seeded orders already in a `dispatched` or `delivered` state show real values; anything
placed through the checkout flow above will not, for now.

### Invoice — `GET orders/:orderNumber/invoice`

```bash
curl $BASE/orders/ORD-2026-00123/invoice -H "Authorization: Bearer $TOKEN" -o invoice.pdf
```

- **The file name is in `Content-Disposition`**, which CORS exposes (`exposedHeaders`), so a frontend on another origin can read it.
- **Only available once dispatched.** `placed`/`confirmed`/`picking` orders return
  `ECB409 "The invoice is not available until this order has dispatched"` — nothing to
  invoice until the seller has actually sent it.
- **Generated once, on first download, then reused.** The first request renders the PDF,
  writes it to disk, and inserts one `Invoice` row with the seller/buyer details **copied
  onto the row at that moment** — a later business-name change never rewrites an already-
  issued invoice (CLAUDE.md §4.4). Every subsequent download of the same order serves that
  same file; nothing is regenerated.
- **No `invoiceNumber` on `GET orders/:orderNumber`** — intentional, not an omission. The
  invoice may not exist yet (nothing has been downloaded), so the order detail response
  never implies one it can't back up. The number only exists once the PDF does, inside
  `InvoiceDownload`.
- **Invoice numbers are their own gapless sequence** (`INV-2026-00001`), separate from
  `order_number` — orders can be cancelled before ever being invoiced, which would leave
  holes in a shared sequence.

**Reorder never creates a new order** — it adds each line back into the cart via the same
`addItem` the "Add to cart" button uses, so the buyer reviews current prices and goes
through checkout normally (ADR 0026). It's best effort, not all-or-nothing: a line that's
no longer orderable (retired, unapproved supplier, insufficient stock) is skipped and
reported, the rest still get added. The response carries both the updated cart and a
per-line outcome:

```json
{
  "cart": { "items": ["..."], "summary": { "...": "..." } },
  "lines": [
    { "productId": "...", "productName": "Chain of Custody Forms (50pk)", "requestedQuantity": 5, "added": true, "reason": null },
    { "productId": "...", "productName": "Hair Follicle Test Kit", "requestedQuantity": 2, "added": false, "reason": "Not enough stock for that quantity (0 available)" }
  ]
}
```

Quantities are additive: reordering twice doubles the quantity, same as adding the same
product to the cart twice.

```bash
pnpm test:e2e
```

---
