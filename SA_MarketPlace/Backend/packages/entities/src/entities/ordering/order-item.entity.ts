import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Product } from '../catalogue'
import { Order } from './order.entity'

/** A frozen order line (§6.12). Name, sku and price are snapshots; productId is never for display. */
@Entity('order_item')
@Check('ck_order_item_quantity_positive', '"quantity" > 0')
@Index('idx_order_item_order_id', ['orderId'])
@Index('idx_order_item_product_id', ['productId'])
export class OrderItem {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'pk_order_item' })
  id!: string

  @Column({ type: 'uuid' })
  orderId!: string

  /** Reference only. Display uses the snapshots below. */
  @Column({ type: 'uuid' })
  productId!: string

  @Column({ type: 'varchar', length: 255 })
  productName!: string

  @Column({ type: 'varchar', length: 64 })
  sku!: string

  @Column({ type: 'int' })
  quantity!: number

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  unitPriceAtPurchase!: string

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  lineTotal!: string

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'order_id',
    foreignKeyConstraintName: 'fk_order_item_order',
  })
  order!: Order

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'product_id',
    foreignKeyConstraintName: 'fk_order_item_product',
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
