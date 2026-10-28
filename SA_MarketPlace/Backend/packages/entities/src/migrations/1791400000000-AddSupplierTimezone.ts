import { MigrationInterface, QueryRunner } from 'typeorm'

// Each supplier carries its own IANA timezone; default Australia/Sydney as signup doesn't ask.
export class AddSupplierTimezone1791400000000 implements MigrationInterface {
  name = 'AddSupplierTimezone1791400000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "supplier_profile" ADD "timezone" character varying(64) NOT NULL DEFAULT 'Australia/Sydney'`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "supplier_profile" DROP COLUMN "timezone"`,
    )
  }
}
