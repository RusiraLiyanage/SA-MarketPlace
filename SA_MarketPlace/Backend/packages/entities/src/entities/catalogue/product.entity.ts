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
import { ListingStatus } from '../../enums'
import { SupplierProfile } from '../identity'
import { Category } from './category.entity'

/** A seller's listing (§6.7). Buyer-visible only if published AND supplier approved; retire, never delete. */
@Entity('product')
@Unique('uq_product_supplier_profile_id_sku', ['supplierProfileId', 'sku'])
@Index('idx_product_category_id', ['categoryId'])
@Index('idx_product_listing_status_category_id', [
  'listingStatus',
  'categoryId',
])
@Index('idx_product_supplier_profile_id_listing_status', [
  'supplierProfileId',
  'listingStatus',
])
// Real index is GIN gin_trgm_ops; TypeORM compares by name and columns only, so plain is safe.
@Index('idx_product_name_trgm', ['name'])
export class Product {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'pk_product' })
  id!: string

  @Column({ type: 'uuid' })
  supplierProfileId!: string

  @Column({ type: 'uuid' })
  categoryId!: string

  @Column({ type: 'varchar', length: 255 })
  name!: string

  @Column({ type: 'text', nullable: true })
  description!: string | null

  /** Unique per supplier, not globally. */
  @Column({ type: 'varchar', length: 64 })
  sku!: string

  /** GST-inclusive. String, not number — see the class comment. */
  @Column({ type: 'numeric', precision: 10, scale: 2 })
  price!: string

  /** The SUPPLIER's sellable stock. Decrements when an order is placed. */
  @Column({ type: 'int', default: 0 })
  quantity!: number

  @Column({ type: 'int', default: 0 })
  lowStockThreshold!: number

  @Column({
    type: 'enum',
    enum: ListingStatus,
    enumName: 'listing_status',
    default: ListingStatus.draft,
  })
  listingStatus!: ListingStatus

  @Column({ type: 'varchar', length: 120, nullable: true })
  brand!: string | null

  @Column({ type: 'varchar', length: 120, nullable: true })
  manufacturer!: string | null

  @Column({ type: 'varchar', length: 60, nullable: true })
  packSize!: string | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  certification!: string | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  storageConditions!: string | null

  @Column({ type: 'int', nullable: true })
  shelfLifeMonths!: number | null

  @ManyToOne(() => SupplierProfile, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'supplier_profile_id',
    foreignKeyConstraintName: 'fk_product_supplier_profile',
  })
  supplierProfile!: SupplierProfile

  @ManyToOne(() => Category, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'category_id',
    foreignKeyConstraintName: 'fk_product_category',
  })
  category!: Category

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
