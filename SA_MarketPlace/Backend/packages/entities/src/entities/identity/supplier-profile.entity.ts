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
import { SupplierStatus } from '../../enums'
import { User } from './user.entity'

/** A supplier business (§6.4). Products belong to it, not its user; approved status makes listings visible. */
@Entity('supplier_profile')
@Unique('uq_supplier_profile_user_id', ['userId'])
@Index('idx_supplier_profile_approved_by_user_id', ['approvedByUserId'])
@Index('idx_supplier_profile_status', ['status'])
export class SupplierProfile {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'pk_supplier_profile',
  })
  id!: string

  @Column({ type: 'uuid' })
  userId!: string

  @Column({ type: 'varchar', length: 255 })
  businessName!: string

  @Column({ type: 'varchar', length: 11 })
  abn!: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  businessType!: string | null

  @Column({
    type: 'enum',
    enum: SupplierStatus,
    enumName: 'supplier_status',
    default: SupplierStatus.pendingReview,
  })
  status!: SupplierStatus

  @Column({ type: 'uuid', nullable: true })
  approvedByUserId!: string | null

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt!: Date | null

  /** Shown to the applicant when rejected. */
  @Column({ type: 'text', nullable: true })
  rejectionReason!: string | null

  /** When the application was last submitted — re-set when a rejected one is resubmitted. */
  @Column({ type: 'timestamptz' })
  submittedAt!: Date

  /** When an admin approved or rejected it. Null while pending. */
  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null

  /** When the seller dismissed the "you're approved" notice, so it shows once. */
  @Column({ type: 'timestamptz', nullable: true })
  approvalAcknowledgedAt!: Date | null

  /** IANA timezone defining this seller's day boundaries; times stay UTC (ADR 0033). */
  @Column({ type: 'varchar', length: 64, default: 'Australia/Sydney' })
  timezone!: string

  @Column({ type: 'int', default: 48 })
  dispatchSlaHours!: number

  @Column({ type: 'varchar', length: 100, nullable: true })
  defaultCarrier!: string | null

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'fk_supplier_profile_user',
  })
  user!: User

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({
    name: 'approved_by_user_id',
    foreignKeyConstraintName: 'fk_supplier_profile_approved_by_user',
  })
  approvedByUser!: User | null

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
