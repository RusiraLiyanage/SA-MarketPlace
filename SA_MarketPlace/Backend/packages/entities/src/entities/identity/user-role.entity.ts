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
import { UserRoleType } from '../../enums'
import { User } from './user.entity'

/** A role held by a user (§6.3). UNIQUE (user_id, role) lets one account hold several. */
@Entity('user_role')
@Unique('uq_user_role_user_id_role', ['userId', 'role'])
export class UserRole {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'pk_user_role' })
  id!: string

  @Column({ type: 'uuid' })
  userId!: string

  @Column({ type: 'enum', enum: UserRoleType, enumName: 'user_role_type' })
  role!: UserRoleType

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'fk_user_role_user',
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
