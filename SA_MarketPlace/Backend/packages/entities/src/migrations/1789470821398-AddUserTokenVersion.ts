import { MigrationInterface, QueryRunner } from 'typeorm'

// Lets logout invalidate every token issued before it.
export class AddUserTokenVersion1789470821398 implements MigrationInterface {
  name = 'AddUserTokenVersion1789470821398'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "token_version" integer NOT NULL DEFAULT 0`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "token_version"`)
  }
}
