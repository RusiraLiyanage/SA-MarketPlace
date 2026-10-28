import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Billing and fulfilment tables (DATABASE.md §6.13–6.16). PCI: payment holds card_last4/brand only,
 * never card number, CVC or expiry. Invoice is a frozen document (§6.14); no invoice_line while orders are immutable.
 * Number columns are UNIQUE only; a SEQUENCE is not gapless. Each 1:1 with order via UNIQUE order_id.
 */
export class CreateBillingAndFulfilmentTables1788236120988
  implements MigrationInterface
{
  name = 'CreateBillingAndFulfilmentTables1788236120988'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "carrier" (
        "id"         uuid          NOT NULL DEFAULT gen_random_uuid(),
        "name"       varchar(120)  NOT NULL,
        "created_at" timestamptz   NOT NULL DEFAULT now(),
        "updated_at" timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_carrier"      PRIMARY KEY ("id"),
        CONSTRAINT "uq_carrier_name" UNIQUE ("name")
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "payment" (
        "id"                    uuid              NOT NULL DEFAULT gen_random_uuid(),
        "order_id"              uuid              NOT NULL,
        "method"                "payment_method"  NOT NULL,
        "status"                "payment_status"  NOT NULL DEFAULT 'pending',
        "amount"                numeric(10,2)     NOT NULL,
        "transaction_reference" varchar(100)          NULL,
        "card_last4"            varchar(4)            NULL,
        "card_brand"            varchar(30)           NULL,
        "paid_at"               timestamptz           NULL,
        "created_at"            timestamptz       NOT NULL DEFAULT now(),
        "updated_at"            timestamptz       NOT NULL DEFAULT now(),
        CONSTRAINT "pk_payment"          PRIMARY KEY ("id"),
        CONSTRAINT "uq_payment_order_id" UNIQUE ("order_id"),
        CONSTRAINT "fk_payment_order" FOREIGN KEY ("order_id")
          REFERENCES "order" ("id") ON DELETE RESTRICT
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "invoice" (
        "id"                      uuid           NOT NULL DEFAULT gen_random_uuid(),
        "order_id"                uuid           NOT NULL,
        "invoice_number"          varchar(32)    NOT NULL,
        "issued_at"               timestamptz    NOT NULL,
        "seller_business_name"    varchar(255)   NOT NULL,
        "seller_abn"              varchar(11)    NOT NULL,
        "buyer_organisation_name" varchar(255)   NOT NULL,
        "buyer_address"           text           NOT NULL,
        "subtotal"                numeric(10,2)  NOT NULL,
        "gst_total"               numeric(10,2)  NOT NULL,
        "total"                   numeric(10,2)  NOT NULL,
        "pdf_path"                varchar(500)   NOT NULL,
        "created_at"              timestamptz    NOT NULL DEFAULT now(),
        "updated_at"              timestamptz    NOT NULL DEFAULT now(),
        CONSTRAINT "pk_invoice"                PRIMARY KEY ("id"),
        CONSTRAINT "uq_invoice_order_id"       UNIQUE ("order_id"),
        CONSTRAINT "uq_invoice_invoice_number" UNIQUE ("invoice_number"),
        CONSTRAINT "fk_invoice_order" FOREIGN KEY ("order_id")
          REFERENCES "order" ("id") ON DELETE RESTRICT
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "delivery" (
        "id"                 uuid          NOT NULL DEFAULT gen_random_uuid(),
        "order_id"           uuid          NOT NULL,
        "attention_name"     varchar(150)      NULL,
        "street_address"     varchar(255)  NOT NULL,
        "suburb"             varchar(120)  NOT NULL,
        "state"              varchar(10)   NOT NULL,
        "postcode"           varchar(10)   NOT NULL,
        "country"            varchar(60)   NOT NULL DEFAULT 'Australia',
        "notes"              text              NULL,
        "carrier_id"         uuid              NULL,
        -- tracking_number lives here ONLY, never also on "order" (§6.16).
        "tracking_number"    varchar(100)      NULL,
        "dispatched_on"      date              NULL,
        "estimated_delivery" date              NULL,
        "delivered_at"       timestamptz       NULL,
        "created_at"         timestamptz   NOT NULL DEFAULT now(),
        "updated_at"         timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_delivery"          PRIMARY KEY ("id"),
        CONSTRAINT "uq_delivery_order_id" UNIQUE ("order_id"),
        CONSTRAINT "fk_delivery_order" FOREIGN KEY ("order_id")
          REFERENCES "order" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_delivery_carrier" FOREIGN KEY ("carrier_id")
          REFERENCES "carrier" ("id") ON DELETE RESTRICT
      )
    `)

    // order_id on payment/invoice/delivery is covered by UNIQUE.
    await queryRunner.query(
      `CREATE INDEX "idx_delivery_carrier_id" ON "delivery" ("carrier_id")`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "delivery"`)
    await queryRunner.query(`DROP TABLE "invoice"`)
    await queryRunner.query(`DROP TABLE "payment"`)
    await queryRunner.query(`DROP TABLE "carrier"`)
  }
}
