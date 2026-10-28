# ADR 0040 — Product categories are worked out from a supplier's products

## Context
The designs show "Product categories" on seller sign-up, on the seller's Business Profile and on the
admin's application review. ADR 0031 and ADR 0037 left it out because a supplier has no link to a
category, only its products do (`product.category_id`). Two ways to supply it were weighed: store what
a supplier says it supplies, or work it out from what it lists.

## Decision
- **Derived, not stored.** There is no column or table. `getSupplierProductCategories`
  (`packages/common`) returns the distinct categories of the supplier's products, so the seller app and
  the admin app cannot disagree and there is no second copy to drift when a product is edited.
- **What counts.** Products that are not retired (a draft counts, a retired product does not). A
  sub-category rolls up to its parent, so "Urine Collection" shows as "Collection Kits", matching the
  top-level names in the designs. The result is distinct names, A to Z.
- **Seller app.** `GET /auth/profile` returns `productCategories: string[]`, read-only. `PATCH` rejects
  the field like any unknown one. Sign-up and the resubmit form do not collect it.
- **Admin app.** `GET /suppliers/:supplierId` returns the same list.

## Consequences
- **A pending application shows no categories.** Only an approved seller can create products, so the
  admin reviewing a new applicant sees an empty list (the frontend shows "None yet"). The admin cannot use
  declared categories to judge eligibility. The alternative, a `supplier_profile_category` join table filled
  at sign-up, was rejected for this phase because it would be a second source of truth; it can still be
  added later without changing this response.
- **The list moves with the catalogue.** Retiring a supplier's last product in a category removes it from
  both apps.
- **Informational only.** It does not restrict what a seller may list.
- **Role / title is still not stored**, for the same reason as in ADR 0031.
- **Amends ADR 0031 and ADR 0037**: their "not accepted" line for product categories is superseded; role /
  title is unchanged.
