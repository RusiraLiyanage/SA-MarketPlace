import {
  Check,
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
import { UserStatus } from '../../enums'
import { Organisation } from './organisation.entity'

/** One account, many roles (§6.2). Email is globally unique; roles live in user_role. */
@Entity('user')
@Unique('uq_user_email', ['email'])
// Stored lowercased so the plain UNIQUE is case-insensitive; callers must lowercase.
@Check('ck_user_email_lowercase', '"email" = lower("email")')
@Index('idx_user_organisation_id', ['organisationId'])
export class User {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'pk_user' })
  id!: string

  @Column({ type: 'uuid', nullable: true })
  organisationId!: string | null

  @Column({ type: 'varchar', length: 255 })
  email!: string

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string

  // Password length for My Profile's dots; a bcrypt hash can't reveal it. Write alongside passwordHash.
  @Column({ type: 'int' })
  passwordLength!: number

  @Column({ type: 'varchar', length: 100 })
  firstName!: string

  @Column({ type: 'varchar', length: 100 })
  lastName!: string

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone!: string | null

  @Column({
    type: 'enum',
    enum: UserStatus,
    enumName: 'user_status',
    default: UserStatus.active,
  })
  status!: UserStatus

  // Bumped on logout so every token issued before it stops working.
  @Column({ type: 'int', default: 0 })
  tokenVersion!: number

  // When the account holder accepted the terms. Null for accounts created before this.
  @Column({ type: 'timestamptz', nullable: true })
  termsAcceptedAt!: Date | null

  // The latest sign-in recorded, for the admin's My Profile. Null until the first one, and
  // only the admin app records it (ADR 0039).
  @Column({ type: 'timestamptz', nullable: true })
  lastSignInAt!: Date | null

  @ManyToOne(() => Organisation, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({
    name: 'organisation_id',
    foreignKeyConstraintName: 'fk_user_organisation',
  })
  organisation!: Organisation | null

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
