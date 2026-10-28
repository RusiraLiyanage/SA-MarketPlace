import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm'

/** A delivery carrier, e.g. Australia Post (§6.15). */
@Entity('carrier')
@Unique('uq_carrier_name', ['name'])
export class Carrier {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'pk_carrier' })
  id!: string

  @Column({ type: 'varchar', length: 120 })
  name!: string

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
