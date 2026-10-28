import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm'
import { Order } from '../ordering'

/** An issued tax invoice (§6.14). Seller/buyer details are copied at issue, never joined. */
@Entity('invoice')
@Unique('uq_invoice_order_id', ['orderId'])
@Unique('uq_invoice_invoice_number', ['invoiceNumber'])
export class Invoice {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'pk_invoice' })
  id!: string

  @Column({ type: 'uuid' })
  orderId!: string

  /** e.g. INV-2026-00001. */
  @Column({ type: 'varchar', length: 32 })
  invoiceNumber!: string

  @Column({ type: 'timestamptz' })
  issuedAt!: Date

  @Column({ type: 'varchar', length: 255 })
  sellerBusinessName!: string

  /** Mandatory on an Australian tax invoice. Snapshot. */
  @Column({ type: 'varchar', length: 11 })
  sellerAbn!: string

  @Column({ type: 'varchar', length: 255 })
  buyerOrganisationName!: string

  @Column({ type: 'text' })
  buyerAddress!: string

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  subtotal!: string

  /** Must be shown separately on the document. */
  @Column({ type: 'numeric', precision: 10, scale: 2 })
  gstTotal!: string

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  total!: string

  @Column({ type: 'varchar', length: 500 })
  pdfPath!: string

  @ManyToOne(() => Order, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'order_id',
    foreignKeyConstraintName: 'fk_invoice_order',
  })
  order!: Order

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date

  @UpdateDateColumn({
    type: 'timestamptz',
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date
}
