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

/** Product category (§6.6). parentId self-reference gives sub-categories. */
@Entity('category')
@Unique('uq_category_slug', ['slug'])
@Index('idx_category_parent_id', ['parentId'])
export class Category {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'pk_category' })
  id!: string

  @Column({ type: 'varchar', length: 120 })
  name!: string

  @Column({ type: 'varchar', length: 120 })
  slug!: string

  @Column({ type: 'uuid', nullable: true })
  parentId!: string | null

  @ManyToOne(() => Category, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({
    name: 'parent_id',
    foreignKeyConstraintName: 'fk_category_parent',
  })
  parent!: Category | null

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
