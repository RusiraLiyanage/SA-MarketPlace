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
import { User } from './user.entity'

/** Single-use forgot-password token; stored hashed (SHA-256), never raw, as it is a bearer credential. */
@Entity('password_reset_token')
@Unique('uq_password_reset_token_hash', ['tokenHash'])
@Index('idx_password_reset_token_user_id', ['userId'])
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'pk_password_reset_token',
  })
  id!: string

  @Column({ type: 'uuid' })
  userId!: string

  /** SHA-256 hex digest of the raw token — the raw value is never stored. */
  @Column({ type: 'varchar', length: 64 })
  tokenHash!: string

  @Column({ type: 'timestamptz' })
  expiresAt!: Date

  /** Non-null means consumed. Single use. */
  @Column({ type: 'timestamptz', nullable: true })
  usedAt!: Date | null

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'fk_password_reset_token_user',
  })
  user!: User

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
