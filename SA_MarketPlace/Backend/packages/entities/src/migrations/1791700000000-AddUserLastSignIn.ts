import { MigrationInterface, QueryRunner } from 'typeorm'

// The admin's My Profile shows when they last signed in. Nullable: nobody has a value
// until their next sign-in, and no backfill is possible.
export class AddUserLastSignIn1791700000000 implements MigrationInterface {
  name = 'AddUserLastSignIn1791700000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "last_sign_in_at" TIMESTAMP WITH TIME ZONE`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "last_sign_in_at"`)
  }
}
