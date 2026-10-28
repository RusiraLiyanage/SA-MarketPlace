import { MigrationInterface, QueryRunner } from 'typeorm'

// My Profile dots need the real length; bcrypt hashes hide it. Backfilled to 13 ("Password123!",
// the seed password), then the default is dropped so writes must set it with password_hash.
export class AddUserPasswordLength1791100000000 implements MigrationInterface {
  name = 'AddUserPasswordLength1791100000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "password_length" integer NOT NULL DEFAULT 13`,
    )
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "password_length" DROP DEFAULT`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "password_length"`)
  }
}
