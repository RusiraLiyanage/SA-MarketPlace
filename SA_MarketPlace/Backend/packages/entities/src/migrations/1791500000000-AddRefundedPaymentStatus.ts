import { MigrationInterface, QueryRunner } from 'typeorm'

// A seller can cancel an order the buyer has already paid for, and the buyer is
// refunded in full, so a payment needs a status for that.
// ADD VALUE cannot be undone in place: down() rebuilds the type without it,
// first turning any refunded payments back into paid.
export class AddRefundedPaymentStatus1791500000000
  implements MigrationInterface
{
  name = 'AddRefundedPaymentStatus1791500000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "payment_status" ADD VALUE IF NOT EXISTS 'refunded'`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "payment" SET "status" = 'paid' WHERE "status" = 'refunded'`,
    )
    await queryRunner.query(
      `ALTER TABLE "payment" ALTER COLUMN "status" DROP DEFAULT`,
    )
    await queryRunner.query(
      `ALTER TYPE "payment_status" RENAME TO "payment_status_old"`,
    )
    await queryRunner.query(
      `CREATE TYPE "payment_status" AS ENUM ('pending', 'paid', 'failed')`,
    )
    await queryRunner.query(
      `ALTER TABLE "payment" ALTER COLUMN "status" TYPE "payment_status"
         USING "status"::text::"payment_status"`,
    )
    await queryRunner.query(
      `ALTER TABLE "payment" ALTER COLUMN "status" SET DEFAULT 'pending'`,
    )
    await queryRunner.query(`DROP TYPE "payment_status_old"`)
  }
}
