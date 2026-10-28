import { MigrationInterface, QueryRunner } from 'typeorm'

// ADR 0033: date-times are UTC instants, so bare `date` columns become timestamptz (*_at).
// Existing dates are read as Australian Eastern (DEFAULT_TIMEZONE) day starts; down() reverses it.
export class ConvertDeliveryDatesToTimestamps1791300000000
  implements MigrationInterface
{
  name = 'ConvertDeliveryDatesToTimestamps1791300000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "delivery"
         ALTER COLUMN "dispatched_on" TYPE TIMESTAMP WITH TIME ZONE
         USING ("dispatched_on"::timestamp AT TIME ZONE 'Australia/Sydney')`,
    )
    await queryRunner.query(
      `ALTER TABLE "delivery" RENAME COLUMN "dispatched_on" TO "dispatched_at"`,
    )

    await queryRunner.query(
      `ALTER TABLE "delivery"
         ALTER COLUMN "estimated_delivery" TYPE TIMESTAMP WITH TIME ZONE
         USING ("estimated_delivery"::timestamp AT TIME ZONE 'Australia/Sydney')`,
    )
    await queryRunner.query(
      `ALTER TABLE "delivery" RENAME COLUMN "estimated_delivery" TO "estimated_delivery_at"`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "delivery" RENAME COLUMN "estimated_delivery_at" TO "estimated_delivery"`,
    )
    await queryRunner.query(
      `ALTER TABLE "delivery"
         ALTER COLUMN "estimated_delivery" TYPE DATE
         USING (("estimated_delivery" AT TIME ZONE 'Australia/Sydney')::date)`,
    )

    await queryRunner.query(
      `ALTER TABLE "delivery" RENAME COLUMN "dispatched_at" TO "dispatched_on"`,
    )
    await queryRunner.query(
      `ALTER TABLE "delivery"
         ALTER COLUMN "dispatched_on" TYPE DATE
         USING (("dispatched_on" AT TIME ZONE 'Australia/Sydney')::date)`,
    )
  }
}
