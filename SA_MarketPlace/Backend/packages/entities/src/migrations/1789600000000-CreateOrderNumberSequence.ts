import { MigrationInterface, QueryRunner } from 'typeorm'

// Order numbers (ORD-2026-00129 upward); a sequence so concurrent checkouts never collide.
// Starts at 129 (seed ends at 00128); unowned, so re-seeding never resets it.
export class CreateOrderNumberSequence1789600000000
  implements MigrationInterface
{
  name = 'CreateOrderNumberSequence1789600000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SEQUENCE "order_number_seq" START WITH 129`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SEQUENCE "order_number_seq"`)
  }
}
