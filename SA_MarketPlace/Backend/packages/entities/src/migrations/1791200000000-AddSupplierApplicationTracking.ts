import { MigrationInterface, QueryRunner } from 'typeorm'

// Application status needs submitted/reviewed dates and a once-only approval notice.
// submitted_at (from created_at) is NOT NULL with no default; reviewed_at backfills approved_at, else updated_at.
export class AddSupplierApplicationTracking1791200000000
  implements MigrationInterface
{
  name = 'AddSupplierApplicationTracking1791200000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "supplier_profile" ADD "submitted_at" TIMESTAMP WITH TIME ZONE`,
    )
    await queryRunner.query(
      `UPDATE "supplier_profile" SET "submitted_at" = "created_at"`,
    )
    await queryRunner.query(
      `ALTER TABLE "supplier_profile" ALTER COLUMN "submitted_at" SET NOT NULL`,
    )

    await queryRunner.query(
      `ALTER TABLE "supplier_profile" ADD "reviewed_at" TIMESTAMP WITH TIME ZONE`,
    )
    await queryRunner.query(
      `UPDATE "supplier_profile"
       SET "reviewed_at" = COALESCE("approved_at", "updated_at")
       WHERE "status" <> 'pending_review'`,
    )

    await queryRunner.query(
      `ALTER TABLE "supplier_profile" ADD "approval_acknowledged_at" TIMESTAMP WITH TIME ZONE`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "supplier_profile" DROP COLUMN "approval_acknowledged_at"`,
    )
    await queryRunner.query(
      `ALTER TABLE "supplier_profile" DROP COLUMN "reviewed_at"`,
    )
    await queryRunner.query(
      `ALTER TABLE "supplier_profile" DROP COLUMN "submitted_at"`,
    )
  }
}
