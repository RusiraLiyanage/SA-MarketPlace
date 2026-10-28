import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Catalogue tables (DATABASE.md §6.6–6.8). Spec fields live on product (§6.7). No stock_status
 * column (derived from quantity) and no hard delete: products retire via listing_status (§5).
 */
export class CreateCatalogueTables1788236118988 implements MigrationInterface {
  name = 'CreateCatalogueTables1788236118988'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "category" (
        "id"         uuid          NOT NULL DEFAULT gen_random_uuid(),
        "name"       varchar(120)  NOT NULL,
        "slug"       varchar(120)  NOT NULL,
        "parent_id"  uuid              NULL,
        "created_at" timestamptz   NOT NULL DEFAULT now(),
        "updated_at" timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_category"      PRIMARY KEY ("id"),
        CONSTRAINT "uq_category_slug" UNIQUE ("slug"),
        CONSTRAINT "fk_category_parent" FOREIGN KEY ("parent_id")
          REFERENCES "category" ("id") ON DELETE RESTRICT
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "product" (
        "id"                  uuid              NOT NULL DEFAULT gen_random_uuid(),
        "supplier_profile_id" uuid              NOT NULL,
        "category_id"         uuid              NOT NULL,
        "name"                varchar(255)      NOT NULL,
        "description"         text                  NULL,
        "sku"                 varchar(64)       NOT NULL,
        "price"               numeric(10,2)     NOT NULL,
        "quantity"            int               NOT NULL DEFAULT 0,
        "low_stock_threshold" int               NOT NULL DEFAULT 0,
        "listing_status"      "listing_status"  NOT NULL DEFAULT 'draft',
        "brand"               varchar(120)          NULL,
        "manufacturer"        varchar(120)          NULL,
        "pack_size"           varchar(60)           NULL,
        "certification"       varchar(255)          NULL,
        "storage_conditions"  varchar(255)          NULL,
        "shelf_life_months"   int                   NULL,
        "created_at"          timestamptz       NOT NULL DEFAULT now(),
        "updated_at"          timestamptz       NOT NULL DEFAULT now(),
        CONSTRAINT "pk_product" PRIMARY KEY ("id"),
        -- SKUs are unique per supplier, not globally: two suppliers may legitimately
        -- both use "UCK-001" for their own products (§6.7).
        CONSTRAINT "uq_product_supplier_profile_id_sku" UNIQUE ("supplier_profile_id", "sku"),
        CONSTRAINT "fk_product_supplier_profile" FOREIGN KEY ("supplier_profile_id")
          REFERENCES "supplier_profile" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_product_category" FOREIGN KEY ("category_id")
          REFERENCES "category" ("id") ON DELETE RESTRICT
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "product_image" (
        "id"         uuid          NOT NULL DEFAULT gen_random_uuid(),
        "product_id" uuid          NOT NULL,
        "path"       varchar(500)  NOT NULL,
        "alt_text"   varchar(255)      NULL,
        "sort_order" int           NOT NULL DEFAULT 0,
        "is_primary" boolean       NOT NULL DEFAULT false,
        "created_at" timestamptz   NOT NULL DEFAULT now(),
        "updated_at" timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_product_image" PRIMARY KEY ("id"),
        CONSTRAINT "fk_product_image_product" FOREIGN KEY ("product_id")
          REFERENCES "product" ("id") ON DELETE CASCADE
      )
    `)

    // product.supplier_profile_id is covered by uq_product_supplier_profile_id_sku.
    await queryRunner.query(
      `CREATE INDEX "idx_category_parent_id" ON "category" ("parent_id")`,
    )
    await queryRunner.query(
      `CREATE INDEX "idx_product_category_id" ON "product" ("category_id")`,
    )
    await queryRunner.query(
      `CREATE INDEX "idx_product_image_product_id" ON "product_image" ("product_id")`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "product_image"`)
    await queryRunner.query(`DROP TABLE "product"`)
    await queryRunner.query(`DROP TABLE "category"`)
  }
}
