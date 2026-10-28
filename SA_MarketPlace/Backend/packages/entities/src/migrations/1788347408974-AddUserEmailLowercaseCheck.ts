import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Case-insensitive user.email uniqueness (DATABASE.md §6.2) via a lowercase CHECK, since a lower(email)
 * index can't be expressed in TypeORM decorators. Callers must lowercase on register and login.
 */
export class AddUserEmailLowercaseCheck1788347408974
  implements MigrationInterface
{
  name = 'AddUserEmailLowercaseCheck1788347408974'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "user" SET "email" = lower("email") WHERE "email" <> lower("email")`,
    )
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "ck_user_email_lowercase" CHECK ("email" = lower("email"))`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "ck_user_email_lowercase"`,
    )
  }
}
