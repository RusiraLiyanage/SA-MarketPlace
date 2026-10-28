import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Identity tables (DATABASE.md §6.1–6.5). "user" is reserved in Postgres: always double-quote it.
 * ON DELETE RESTRICT except user_role (cascade), since DATABASE.md §5 prefers status over deletes.
 */
export class CreateIdentityTables1788235867057 implements MigrationInterface {
  name = 'CreateIdentityTables1788235867057'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "organisation" (
        "id"              uuid          NOT NULL DEFAULT gen_random_uuid(),
        "name"            varchar(255)  NOT NULL,
        "abn"             varchar(11)       NULL,
        "billing_address" text              NULL,
        "created_at"      timestamptz   NOT NULL DEFAULT now(),
        "updated_at"      timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_organisation" PRIMARY KEY ("id")
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "user" (
        "id"              uuid           NOT NULL DEFAULT gen_random_uuid(),
        "organisation_id" uuid               NULL,
        "email"           varchar(255)   NOT NULL,
        "password_hash"   varchar(255)   NOT NULL,
        "first_name"      varchar(100)   NOT NULL,
        "last_name"       varchar(100)   NOT NULL,
        "phone"           varchar(32)        NULL,
        "status"          "user_status"  NOT NULL DEFAULT 'active',
        "created_at"      timestamptz    NOT NULL DEFAULT now(),
        "updated_at"      timestamptz    NOT NULL DEFAULT now(),
        CONSTRAINT "pk_user"      PRIMARY KEY ("id"),
        CONSTRAINT "uq_user_email" UNIQUE ("email"),
        CONSTRAINT "fk_user_organisation" FOREIGN KEY ("organisation_id")
          REFERENCES "organisation" ("id") ON DELETE RESTRICT
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "user_role" (
        "id"         uuid              NOT NULL DEFAULT gen_random_uuid(),
        "user_id"    uuid              NOT NULL,
        "role"       "user_role_type"  NOT NULL,
        "created_at" timestamptz       NOT NULL DEFAULT now(),
        "updated_at" timestamptz       NOT NULL DEFAULT now(),
        CONSTRAINT "pk_user_role" PRIMARY KEY ("id"),
        CONSTRAINT "uq_user_role_user_id_role" UNIQUE ("user_id", "role"),
        CONSTRAINT "fk_user_role_user" FOREIGN KEY ("user_id")
          REFERENCES "user" ("id") ON DELETE CASCADE
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "supplier_profile" (
        "id"                  uuid               NOT NULL DEFAULT gen_random_uuid(),
        "user_id"             uuid               NOT NULL,
        "business_name"       varchar(255)       NOT NULL,
        "abn"                 varchar(11)        NOT NULL,
        "business_type"       varchar(100)           NULL,
        "status"              "supplier_status"  NOT NULL DEFAULT 'pending_review',
        "approved_by_user_id" uuid                   NULL,
        "approved_at"         timestamptz            NULL,
        "rejection_reason"    text                   NULL,
        "dispatch_sla_hours"  int                NOT NULL DEFAULT 48,
        "default_carrier"     varchar(100)           NULL,
        "created_at"          timestamptz        NOT NULL DEFAULT now(),
        "updated_at"          timestamptz        NOT NULL DEFAULT now(),
        CONSTRAINT "pk_supplier_profile" PRIMARY KEY ("id"),
        CONSTRAINT "uq_supplier_profile_user_id" UNIQUE ("user_id"),
        CONSTRAINT "fk_supplier_profile_user" FOREIGN KEY ("user_id")
          REFERENCES "user" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_supplier_profile_approved_by_user" FOREIGN KEY ("approved_by_user_id")
          REFERENCES "user" ("id") ON DELETE RESTRICT
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "admin_invite" (
        "id"                 uuid          NOT NULL DEFAULT gen_random_uuid(),
        "code"               varchar(32)   NOT NULL,
        "email"              varchar(255)  NOT NULL,
        "invited_by_user_id" uuid          NOT NULL,
        "expires_at"         timestamptz   NOT NULL,
        "used_at"            timestamptz       NULL,
        "created_at"         timestamptz   NOT NULL DEFAULT now(),
        "updated_at"         timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_admin_invite" PRIMARY KEY ("id"),
        CONSTRAINT "uq_admin_invite_code" UNIQUE ("code"),
        CONSTRAINT "fk_admin_invite_invited_by_user" FOREIGN KEY ("invited_by_user_id")
          REFERENCES "user" ("id") ON DELETE RESTRICT
      )
    `)

    // Postgres doesn't index FK columns (DATABASE.md §5); user_role.user_id and
    // supplier_profile.user_id are already covered by their unique constraints.
    await queryRunner.query(
      `CREATE INDEX "idx_user_organisation_id" ON "user" ("organisation_id")`,
    )
    await queryRunner.query(
      `CREATE INDEX "idx_supplier_profile_approved_by_user_id" ON "supplier_profile" ("approved_by_user_id")`,
    )
    await queryRunner.query(
      `CREATE INDEX "idx_admin_invite_invited_by_user_id" ON "admin_invite" ("invited_by_user_id")`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse creation order.
    await queryRunner.query(`DROP TABLE "admin_invite"`)
    await queryRunner.query(`DROP TABLE "supplier_profile"`)
    await queryRunner.query(`DROP TABLE "user_role"`)
    await queryRunner.query(`DROP TABLE "user"`)
    await queryRunner.query(`DROP TABLE "organisation"`)
  }
}
