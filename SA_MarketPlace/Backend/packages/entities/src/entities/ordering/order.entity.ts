import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm'
import { OrderStatus } from '../../enums'
import { Organisation, SupplierProfile, User } from '../identity'

/** A placed order (§6.11). One supplier per order; checkout splits multi-supplier carts. */
@Entity('order')
@Unique('uq_order_order_number', ['orderNumber'])
@Index('idx_order_organisation_id', ['organisationId'])
// Both placed_at indexes are DESC in the DB; TypeORM can't express sort direction.
@Index('idx_order_user_id_placed_at', ['userId', 'placedAt'])
@Index('idx_order_supplier_profile_id_status', ['supplierProfileId', 'status'])
@Index('idx_order_status_placed_at', ['status', 'placedAt'])
export class Order {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'pk_order' })
  id!: string

  /** e.g. ORD-2026-00123. Its own sequence, separate from invoice_number. */
  @Column({ type: 'varchar', length: 32 })
  orderNumber!: string

  @Column({ type: 'uuid' })
  userId!: string

  /** Snapshot of the buyer's organisation at order time. */
  @Column({ type: 'uuid', nullable: true })
  organisationId!: string | null

  @Column({ type: 'uuid' })
  supplierProfileId!: string

  @Column({ type: 'enum', enum: OrderStatus, enumName: 'order_status' })
  status!: OrderStatus

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  subtotal!: string

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  gstTotal!: string

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  total!: string

  @Column({ type: 'timestamptz' })
  placedAt!: Date

  @Column({ type: 'text', nullable: true })
  cancellationReason!: string | null

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'fk_order_user' })
  user!: User

  @ManyToOne(() => Organisation, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({
    name: 'organisation_id',
    foreignKeyConstraintName: 'fk_order_organisation',
  })
  organisation!: Organisation | null

  @ManyToOne(() => SupplierProfile, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'supplier_profile_id',
    foreignKeyConstraintName: 'fk_order_supplier_profile',
  })
  supplierProfile!: SupplierProfile

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
