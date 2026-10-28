import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

/** A buying organisation (§6.1); orders, invoices and inventory hang off it. */
@Entity('organisation')
export class Organisation {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'pk_organisation',
  })
  id!: string

  @Column({ type: 'varchar', length: 255 })
  name!: string

  @Column({ type: 'varchar', length: 11, nullable: true })
  abn!: string | null

  @Column({ type: 'text', nullable: true })
  billingAddress!: string | null

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
