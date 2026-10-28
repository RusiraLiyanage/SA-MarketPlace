import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Inventory (DATABASE.md §6.17): buyer organisation shelf stock, up on delivery; product.quantity is
 * supplier stock, down on order. Never touch both. Known gap: no consumption path yet (CLAUDE.md §4.5).
 */
export class CreateInventoryTable1788236121988 implements MigrationInterface {
  name = 'CreateInventoryTable1788236121988'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "inventory" (
        "id"               uuid         NOT NULL DEFAULT gen_random_uuid(),
        "organisation_id"  uuid         NOT NULL,
        "product_id"       uuid         NOT NULL,
        "quantity_on_hand" int          NOT NULL DEFAULT 0,
        "created_at"       timestamptz  NOT NULL DEFAULT now(),
        "updated_at"       timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_inventory" PRIMARY KEY ("id"),
        -- One row per organisation per product. Without this, two concurrent
        -- deliveries could create two rows and split the count.
        CONSTRAINT "uq_inventory_organisation_id_product_id"
          UNIQUE ("organisation_id", "product_id"),
        CONSTRAINT "ck_inventory_quantity_on_hand_non_negative"
          CHECK ("quantity_on_hand" >= 0),
        CONSTRAINT "fk_inventory_organisation" FOREIGN KEY ("organisation_id")
          REFERENCES "organisation" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_inventory_product" FOREIGN KEY ("product_id")
          REFERENCES "product" ("id") ON DELETE RESTRICT
      )
    `)

    // organisation_id leads the unique constraint; only product_id needs an index.
    await queryRunner.query(
      `CREATE INDEX "idx_inventory_product_id" ON "inventory" ("product_id")`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "inventory"`)
  }
}
