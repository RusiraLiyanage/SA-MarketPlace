import { MigrationInterface, QueryRunner } from 'typeorm'

// Proof of consent at sign-up. Nullable: existing accounts never agreed to anything.
export class AddUserTermsAcceptedAt1789513279094 implements MigrationInterface {
  name = 'AddUserTermsAcceptedAt1789513279094'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "terms_accepted_at" TIMESTAMP WITH TIME ZONE`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "terms_accepted_at"`,
    )
  }
}
