import { MigrationInterface, QueryRunner } from 'typeorm'

// Own sequence, separate from order_number_seq (ADR 0022); stays gapless by being called
// last, right before the invoice insert (CLAUDE.md §4.4, OrdersService). Starts at 1.
export class CreateInvoiceNumberSequence1790700000000
  implements MigrationInterface
{
  name = 'CreateInvoiceNumberSequence1790700000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SEQUENCE "invoice_number_seq" START WITH 1`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SEQUENCE "invoice_number_seq"`)
  }
}
