import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Query indexes (DATABASE.md §8), one per common query. Composite order matters: idx_product_category_id
 * (migration 2.4) still serves category-only queries. pg_trgm backs ILIKE '%fragment%' search.
 */
export class CreateIndexes1788236122988 implements MigrationInterface {
  name = 'CreateIndexes1788236122988'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "idx_product_listing_status_category_id" ON "product" ("listing_status", "category_id")`,
    )
    await queryRunner.query(
      `CREATE INDEX "idx_product_supplier_profile_id_listing_status" ON "product" ("supplier_profile_id", "listing_status")`,
    )
    await queryRunner.query(
      `CREATE INDEX "idx_order_user_id_placed_at" ON "order" ("user_id", "placed_at" DESC)`,
    )
    await queryRunner.query(
      `CREATE INDEX "idx_order_supplier_profile_id_status" ON "order" ("supplier_profile_id", "status")`,
    )
    await queryRunner.query(
      `CREATE INDEX "idx_order_status_placed_at" ON "order" ("status", "placed_at" DESC)`,
    )
    await queryRunner.query(
      `CREATE INDEX "idx_supplier_profile_status" ON "supplier_profile" ("status")`,
    )

    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`)
    await queryRunner.query(
      `CREATE INDEX "idx_product_name_trgm" ON "product" USING gin ("name" gin_trgm_ops)`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_product_name_trgm"`)
    await queryRunner.query(`DROP EXTENSION IF EXISTS "pg_trgm"`)
    await queryRunner.query(`DROP INDEX "idx_supplier_profile_status"`)
    await queryRunner.query(`DROP INDEX "idx_order_status_placed_at"`)
    await queryRunner.query(`DROP INDEX "idx_order_supplier_profile_id_status"`)
    await queryRunner.query(`DROP INDEX "idx_order_user_id_placed_at"`)
    await queryRunner.query(
      `DROP INDEX "idx_product_supplier_profile_id_listing_status"`,
    )
    await queryRunner.query(
      `DROP INDEX "idx_product_listing_status_category_id"`,
    )
  }
}
