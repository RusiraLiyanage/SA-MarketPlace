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
import { Order } from '../ordering'
import { Carrier } from './carrier.entity'

/** Shipping details for an order (§6.16). trackingNumber lives here only. */
@Entity('delivery')
@Unique('uq_delivery_order_id', ['orderId'])
@Index('idx_delivery_carrier_id', ['carrierId'])
export class Delivery {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'pk_delivery' })
  id!: string

  @Column({ type: 'uuid' })
  orderId!: string

  @Column({ type: 'varchar', length: 150, nullable: true })
  attentionName!: string | null

  @Column({ type: 'varchar', length: 255 })
  streetAddress!: string

  @Column({ type: 'varchar', length: 120 })
  suburb!: string

  @Column({ type: 'varchar', length: 10 })
  state!: string

  @Column({ type: 'varchar', length: 10 })
  postcode!: string

  @Column({ type: 'varchar', length: 60, default: 'Australia' })
  country!: string

  @Column({ type: 'text', nullable: true })
  notes!: string | null

  @Column({ type: 'uuid', nullable: true })
  carrierId!: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  trackingNumber!: string | null

  // UTC instants (ADR 0033): a calendar date has no timezone. Format in AEST at the edge.
  @Column({ type: 'timestamptz', nullable: true })
  dispatchedAt!: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  estimatedDeliveryAt!: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  deliveredAt!: Date | null

  @ManyToOne(() => Order, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'order_id',
    foreignKeyConstraintName: 'fk_delivery_order',
  })
  order!: Order

  @ManyToOne(() => Carrier, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({
    name: 'carrier_id',
    foreignKeyConstraintName: 'fk_delivery_carrier',
  })
  carrier!: Carrier | null

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
