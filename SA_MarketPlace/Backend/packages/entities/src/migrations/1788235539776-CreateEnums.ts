import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Postgres native enum types (DATABASE.md §7). Entities must set `enumName` explicitly,
 * or migration:generate will try to recreate every enum.
 */
export class CreateEnums1788235539776 implements MigrationInterface {
  name = 'CreateEnums1788235539776'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "user_status" AS ENUM ('active', 'suspended', 'pending')`,
    )

    await queryRunner.query(
      `CREATE TYPE "user_role_type" AS ENUM ('buyer', 'seller', 'collection_manager', 'admin')`,
    )

    await queryRunner.query(
      `CREATE TYPE "supplier_status" AS ENUM ('pending_review', 'approved', 'rejected')`,
    )

    await queryRunner.query(
      `CREATE TYPE "listing_status" AS ENUM ('draft', 'published', 'retired')`,
    )

    // Single source of truth for order state; UIs map their own labels (DATABASE.md §7).
    await queryRunner.query(
      `CREATE TYPE "order_status" AS ENUM ('placed', 'confirmed', 'picking', 'dispatched', 'delivered', 'cancelled')`,
    )

    // Phase 1 checkout is mocked: no gateway, no card data.
    await queryRunner.query(
      `CREATE TYPE "payment_method" AS ENUM ('card_mock', 'invoice_on_account')`,
    )

    await queryRunner.query(
      `CREATE TYPE "payment_status" AS ENUM ('pending', 'paid', 'failed')`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // DROP TYPE fails while a column uses it, so later migrations drop their tables first.
    await queryRunner.query(`DROP TYPE "payment_status"`)
    await queryRunner.query(`DROP TYPE "payment_method"`)
    await queryRunner.query(`DROP TYPE "order_status"`)
    await queryRunner.query(`DROP TYPE "listing_status"`)
    await queryRunner.query(`DROP TYPE "supplier_status"`)
    await queryRunner.query(`DROP TYPE "user_role_type"`)
    await queryRunner.query(`DROP TYPE "user_status"`)
  }
}
