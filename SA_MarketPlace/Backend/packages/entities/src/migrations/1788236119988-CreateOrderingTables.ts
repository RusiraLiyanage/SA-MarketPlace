import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Cart and order tables (DATABASE.md §6.9–6.12). "order" is reserved: always double-quote it.
 * cart_item has no price (live); order_item snapshots price at checkout. One order per supplier (§6.11).
 */
export class CreateOrderingTables1788236119988 implements MigrationInterface {
  name = 'CreateOrderingTables1788236119988'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "cart" (
        "id"         uuid         NOT NULL DEFAULT gen_random_uuid(),
        "user_id"    uuid         NOT NULL,
        "created_at" timestamptz  NOT NULL DEFAULT now(),
        "updated_at" timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_cart" PRIMARY KEY ("id"),
        -- One active cart per user (§6.9). Totals are computed from items, never stored.
        CONSTRAINT "uq_cart_user_id" UNIQUE ("user_id"),
        CONSTRAINT "fk_cart_user" FOREIGN KEY ("user_id")
          REFERENCES "user" ("id") ON DELETE CASCADE
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "cart_item" (
        "id"         uuid         NOT NULL DEFAULT gen_random_uuid(),
        "cart_id"    uuid         NOT NULL,
        "product_id" uuid         NOT NULL,
        "quantity"   int          NOT NULL,
        "created_at" timestamptz  NOT NULL DEFAULT now(),
        "updated_at" timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_cart_item" PRIMARY KEY ("id"),
        -- Adding a product already in the cart increments quantity rather than
        -- inserting a second row (§6.10).
        CONSTRAINT "uq_cart_item_cart_id_product_id" UNIQUE ("cart_id", "product_id"),
        CONSTRAINT "ck_cart_item_quantity_positive" CHECK ("quantity" > 0),
        CONSTRAINT "fk_cart_item_cart" FOREIGN KEY ("cart_id")
          REFERENCES "cart" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_cart_item_product" FOREIGN KEY ("product_id")
          REFERENCES "product" ("id") ON DELETE RESTRICT
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "order" (
        "id"                  uuid            NOT NULL DEFAULT gen_random_uuid(),
        "order_number"        varchar(32)     NOT NULL,
        "user_id"             uuid            NOT NULL,
        "organisation_id"     uuid                NULL,
        "supplier_profile_id" uuid            NOT NULL,
        "status"              "order_status"  NOT NULL,
        "subtotal"            numeric(10,2)   NOT NULL,
        "gst_total"           numeric(10,2)   NOT NULL,
        "total"               numeric(10,2)   NOT NULL,
        "placed_at"           timestamptz     NOT NULL,
        "cancellation_reason" text                NULL,
        "created_at"          timestamptz     NOT NULL DEFAULT now(),
        "updated_at"          timestamptz     NOT NULL DEFAULT now(),
        CONSTRAINT "pk_order" PRIMARY KEY ("id"),
        CONSTRAINT "uq_order_order_number" UNIQUE ("order_number"),
        CONSTRAINT "fk_order_user" FOREIGN KEY ("user_id")
          REFERENCES "user" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_order_organisation" FOREIGN KEY ("organisation_id")
          REFERENCES "organisation" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_order_supplier_profile" FOREIGN KEY ("supplier_profile_id")
          REFERENCES "supplier_profile" ("id") ON DELETE RESTRICT
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "order_item" (
        "id"                     uuid           NOT NULL DEFAULT gen_random_uuid(),
        "order_id"               uuid           NOT NULL,
        "product_id"             uuid           NOT NULL,
        "product_name"           varchar(255)   NOT NULL,
        "sku"                    varchar(64)    NOT NULL,
        "quantity"               int            NOT NULL,
        "unit_price_at_purchase" numeric(10,2)  NOT NULL,
        "line_total"             numeric(10,2)  NOT NULL,
        "created_at"             timestamptz    NOT NULL DEFAULT now(),
        "updated_at"             timestamptz    NOT NULL DEFAULT now(),
        CONSTRAINT "pk_order_item" PRIMARY KEY ("id"),
        CONSTRAINT "ck_order_item_quantity_positive" CHECK ("quantity" > 0),
        CONSTRAINT "fk_order_item_order" FOREIGN KEY ("order_id")
          REFERENCES "order" ("id") ON DELETE CASCADE,
        -- RESTRICT, not CASCADE: a product must never be removable in a way that
        -- rewrites order history. product_name and sku above are the display source;
        -- product_id is a reference only (§6.12).
        CONSTRAINT "fk_order_item_product" FOREIGN KEY ("product_id")
          REFERENCES "product" ("id") ON DELETE RESTRICT
      )
    `)

    // order.user_id and order.supplier_profile_id are omitted: migration 2.8 adds composite indexes.
    await queryRunner.query(
      `CREATE INDEX "idx_cart_item_product_id" ON "cart_item" ("product_id")`,
    )
    await queryRunner.query(
      `CREATE INDEX "idx_order_organisation_id" ON "order" ("organisation_id")`,
    )
    await queryRunner.query(
      `CREATE INDEX "idx_order_item_order_id" ON "order_item" ("order_id")`,
    )
    await queryRunner.query(
      `CREATE INDEX "idx_order_item_product_id" ON "order_item" ("product_id")`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "order_item"`)
    await queryRunner.query(`DROP TABLE "order"`)
    await queryRunner.query(`DROP TABLE "cart_item"`)
    await queryRunner.query(`DROP TABLE "cart"`)
  }
}
