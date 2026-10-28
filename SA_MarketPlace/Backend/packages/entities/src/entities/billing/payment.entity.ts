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
import { PaymentMethod, PaymentStatus } from '../../enums'
import { Order } from '../ordering'

/** Payment against an order (§6.13). Never add a card number, CVC or expiry (PCI). */
@Entity('payment')
@Unique('uq_payment_order_id', ['orderId'])
export class Payment {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'pk_payment' })
  id!: string

  @Column({ type: 'uuid' })
  orderId!: string

  @Column({ type: 'enum', enum: PaymentMethod, enumName: 'payment_method' })
  method!: PaymentMethod

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    enumName: 'payment_status',
    default: PaymentStatus.pending,
  })
  status!: PaymentStatus

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount!: string

  /** Mock reference in Phase 1. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  transactionReference!: string | null

  /** Display only. */
  @Column({ type: 'varchar', length: 4, nullable: true })
  cardLast4!: string | null

  /** Display only. */
  @Column({ type: 'varchar', length: 30, nullable: true })
  cardBrand!: string | null

  @Column({ type: 'timestamptz', nullable: true })
  paidAt!: Date | null

  @ManyToOne(() => Order, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'order_id',
    foreignKeyConstraintName: 'fk_payment_order',
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
