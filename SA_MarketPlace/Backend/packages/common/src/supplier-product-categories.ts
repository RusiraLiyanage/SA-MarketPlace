import { Category, ListingStatus, Product } from '@sa-marketplace/entities'
import { EntityManager } from 'typeorm'

/**
 * The top-level categories a supplier's products sit in, A to Z. A supplier has no category of
 * its own: pending applications have no products yet, so they get an empty list.
 */
export async function getSupplierProductCategories(
  manager: EntityManager,
  supplierProfileId: string,
): Promise<string[]> {
  // Step 1: the supplier's products that are not retired, joined to their category and its parent.
  // Step 2: roll a sub-category up to its parent, so "Urine Collection" counts as "Collection Kits".
  // Step 3: distinct names, sorted A to Z; no products → [].
  const rows = await manager
    .createQueryBuilder(Product, 'product')
    .innerJoin(Category, 'category', 'category.id = product.categoryId')
    .leftJoin(Category, 'parent', 'parent.id = category.parentId')
    .select('COALESCE(parent.name, category.name)', 'name')
    .distinct(true)
    .where('product.supplierProfileId = :supplierProfileId', {
      supplierProfileId,
    })
    .andWhere('product.listingStatus != :retired', {
      retired: ListingStatus.retired,
    })
    .orderBy('name', 'ASC')
    .getRawMany<{ name: string }>()

  return rows.map((row) => row.name)
}
