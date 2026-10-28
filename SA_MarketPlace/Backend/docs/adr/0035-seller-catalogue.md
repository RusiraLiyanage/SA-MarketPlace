# ADR 0035 — Seller catalogue: one product form, images in the same request, local image storage

## Context
The seller catalogue is the first place sellers *write* data other people see. Several
choices have no obvious answer from the designs: what Save draft and Publish mean on a
published product, how a two-dropdown category maps onto one column, how images travel,
where they live, and how an edit avoids overwriting stock that sold in the meantime.

## Decision
- **Six routes under `/catalogue`**, all behind `ApprovedSupplierGuard`: the table (`GET`),
  the category dropdowns (`GET categories`), one product (`GET :productId`), create (`POST`),
  update (`PATCH :productId`) and retire (`POST :productId/retire`). Every query is scoped by the seller from the token. Another
  seller's product is a 404 identical to a missing one (ADR 0025).
- **Status is sent with every save.** `listingStatus` is `draft` (Save draft, the default) or
  `published` (Publish). `retired` is not settable here. **Save draft on a published product
  unpublishes it**; the cart already treats unpublished products as unavailable. Admin approval
  is still the switch that makes a seller's listings visible; there is no separate publish gate.
- **Publishing needs a description.** On create it is checked on the request. On update it is
  checked on the *result*: clearing the description is refused while the product ends up
  published, and allowed in the same request that moves it to draft.
- **Category and sub-category are one `categoryId`**: the sub-category if one is chosen, else
  the category. `GET :productId` splits it back into `category` and `subCategory` so both
  dropdowns can be pre-selected. No new column.
- **Images travel with the form.** `POST` and `PATCH` accept multipart: the fields plus
  `images` files (at most 4, 5 MB each, JPEG, PNG or WebP). The file type is read from the
  file's first bytes, never its name or declared type. The order sent is the display order;
  the first is primary. An update adds with `images` and removes with `removeImageIds`; there
  is no reorder or choose-primary control, because the design has none. JSON still works when
  there are no files.
- **Product and images are written in one transaction.** The product row goes first, so a
  duplicate SKU fails before any file is written. Files are written next, then their rows. Any
  failure rolls back and deletes the files this request wrote. On update, removed files are
  deleted only after the commit, best effort.
- **Images live on local disk** under `Backend/storage/products/<random>.<ext>` (gitignored,
  like invoices). `product_image.path` is relative (`products/<random>.jpg`), never absolute.
  Both apps serve that folder publicly at `/media/products/<file>`, so an image's URL is
  `/media/` plus its stored path. The route sets `Cross-Origin-Resource-Policy: cross-origin`,
  because helmet's default would stop a frontend on another port from displaying them.
- **Update is a partial update with no defaults.** Only fields sent change. Create has
  defaults (stock 0); update must not, or an edit would silently reset stock. A blank optional
  text *clears* the column on update, but means "not sent" on create (a multipart form sends
  empty inputs as `""`). An empty body is a no-op that writes nothing. The same endpoint serves
  the inline price and stock cells in the table.
- **Concurrent edits queue.** Update locks the product row (`FOR UPDATE`) and checks the image
  cap and the removals *after* taking the lock, so two simultaneous uploads cannot push a
  product past four images. Checkout's stock decrement is atomic, so stock that sold while a
  form was open survives as long as the form does not send `quantity` again.
- **SKU is unique per seller across every status, retired included.** The database
  constraint is the check: the unique violation is caught and turned into 409, so two
  simultaneous requests cannot both win. Another seller may use the same SKU.
- **Retire takes a product off sale for good, and keeps it.** A product is never deleted (§4.7):
  past orders and invoices point at it. `POST :productId/retire` takes no body and sets only
  `listing_status` to `retired`, from draft or published. The UPDATE itself carries the
  condition (`status IN (draft, published)`), so two simultaneous retires, or a retire racing
  an edit, cannot both win: one gets 200, the rest 409 `This product is already retired`.
  It is the seller's own product or a 404, like every route here.
- **Retired is read-only and final in Phase 1.** An update (even an empty one) is 409, and it
  cannot be published again. Its images, stock and SKU stay; the SKU stays reserved, so it
  cannot be reused for another product. Retiring is deliberately unlike Save draft, which is a
  reversible pause: the design puts a confirmation in front of it that says so.
- **What retiring does to everyone else follows from existing rules, not new code.** Buyers
  stop seeing it (the marketplace shows only published products of approved sellers), a cart
  holding it shows "This product is no longer available" and drops out of the total, and
  checkout refuses a cart that still contains it. It stops counting toward the dashboard's
  active listings and low-stock figures and the table's banner. **Orders already placed are not
  affected**: the seller can still dispatch and cancel them, and a cancel returns the units to
  the retired product's stock.
- **Prices stay strings** (ADR 0008). On create the app pads them to two decimals (`7.5`
  becomes `7.50`, `007` becomes `7.00`) so the response equals what the database stores; an
  update re-reads the row, so the database does the padding there.
- **The low-stock banner is part of the table response** (`lowStock`), not a second call. It
  ignores the filter, search and page, so it still shows on the Draft tab. Same rule as the
  dashboard badge: published and at or below the threshold.

## Consequences
- **The low-stock rule now exists three times**: the customer app's `stockStatus`, the
  dashboard's SQL (ADR 0034) and this module. ADR 0034 said to move it to one shared place the
  third time; that has not been done yet and should be.
- **A stale form can still overwrite stock.** A frontend that sends `quantity` unchanged after
  a sale puts the old number back. The mitigation is "send only what changed". The stricter fix
  is a version check on `updatedAt`.
- **Local disk is Phase 1 only.** There is no object storage, resizing, deduplication or
  malware scan. A crash between writing a file and committing can leave an orphan file. No
  background job sweeps for them.
- **Drafts' images are public to anyone who knows the random file name.** The names are not
  guessable, but this is obscurity, not access control.
- **Publishing does not require an image**, so `db:verify`'s "every product has exactly one
  primary image" holds for seeded data only, not for products created through the app.
- **The seeded `product_image` rows point at files that do not exist**, so those URLs 404.
  Products created through the app are fine.
- **Sub-category depth is two levels.** `listCategories` nests children one level; deeper
  categories are ignored.
- **Retire cannot be undone.** If the business later wants to bring a product back, that is a
  new decision (an "un-retire", or relisting under a new SKU), not a missing feature.
- **Not built:** reordering images, choosing the primary image, and a read-only screen for a
  retired product (the table links it as *View*; the data is readable through `GET :productId`).
- The e2e spec swaps the images folder aside to force a write failure and restores it, so a
  developer's local images are never deleted by the tests.
