# ADR 0012 — ON DELETE RESTRICT by default

## Context
DATABASE.md does not specify referential actions, but §5 prefers status columns over
deletes and forbids hard-deleting products and orders.

## Decision

`RESTRICT` on every foreign key, except genuinely owned children which `CASCADE`:
`user_role`, `cart`, `cart_item`, `order_item`, `product_image`.

## Consequences

- A delete that would orphan history fails loudly instead of quietly removing rows.
- `order_item.product_id` is RESTRICT specifically so a product can never be removed in a
  way that rewrites order history.
- Retiring a product means `listingStatus = retired`, never a delete.
