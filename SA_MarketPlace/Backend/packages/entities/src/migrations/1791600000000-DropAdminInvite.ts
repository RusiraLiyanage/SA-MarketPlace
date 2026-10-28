import { MigrationInterface, QueryRunner } from 'typeorm'

// Admin sign-up is no longer invite-gated (ADR 0038), so the invite table has no job.
// down() recreates it exactly as CreateIdentityTables defined it, empty.
export class DropAdminInvite1791600000000 implements MigrationInterface {
  name = 'DropAdminInvite1791600000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Its index and constraints go with it.
    await queryRunner.query(`DROP TABLE "admin_invite"`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
    await queryRunner.query(
      `CREATE INDEX "idx_admin_invite_invited_by_user_id" ON "admin_invite" ("invited_by_user_id")`,
    )
  }
}
