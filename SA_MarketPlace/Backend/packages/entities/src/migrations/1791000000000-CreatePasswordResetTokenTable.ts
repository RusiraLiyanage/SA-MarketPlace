import { MigrationInterface, QueryRunner } from 'typeorm'

/** Single-use forgot-password tokens; stored as a SHA-256 hash, never raw (bearer credential). */
export class CreatePasswordResetTokenTable1791000000000
  implements MigrationInterface
{
  name = 'CreatePasswordResetTokenTable1791000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "password_reset_token" (
        "id"          uuid          NOT NULL DEFAULT gen_random_uuid(),
        "user_id"     uuid          NOT NULL,
        "token_hash"  varchar(64)   NOT NULL,
        "expires_at"  timestamptz   NOT NULL,
        "used_at"     timestamptz       NULL,
        "created_at"  timestamptz   NOT NULL DEFAULT now(),
        "updated_at"  timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_password_reset_token" PRIMARY KEY ("id"),
        CONSTRAINT "uq_password_reset_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "fk_password_reset_token_user" FOREIGN KEY ("user_id")
          REFERENCES "user" ("id") ON DELETE CASCADE
      )
    `)

    // FK not covered by a unique constraint (DATABASE.md §5), unlike token_hash.
    await queryRunner.query(
      `CREATE INDEX "idx_password_reset_token_user_id" ON "password_reset_token" ("user_id")`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "password_reset_token"`)
  }
}
