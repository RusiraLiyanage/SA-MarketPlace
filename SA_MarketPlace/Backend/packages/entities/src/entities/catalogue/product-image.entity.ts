import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Product } from './product.entity'

/** Product imagery (§6.8). Local paths in Phase 1. */
@Entity('product_image')
@Index('idx_product_image_product_id', ['productId'])
export class ProductImage {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'pk_product_image',
  })
  id!: string

  @Column({ type: 'uuid' })
  productId!: string

  @Column({ type: 'varchar', length: 500 })
  path!: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  altText!: string | null

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @Column({ type: 'boolean', default: false })
  isPrimary!: boolean

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'product_id',
    foreignKeyConstraintName: 'fk_product_image_product',
  })
  product!: Product

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
