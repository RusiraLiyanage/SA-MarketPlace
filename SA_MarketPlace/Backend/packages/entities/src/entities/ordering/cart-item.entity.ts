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
import { Product } from '../catalogue'
import { Cart } from './cart.entity'

/** A cart line (§6.10). No price column: live prices; snapshot happens at checkout. */
@Entity('cart_item')
@Unique('uq_cart_item_cart_id_product_id', ['cartId', 'productId'])
@Check('ck_cart_item_quantity_positive', '"quantity" > 0')
@Index('idx_cart_item_product_id', ['productId'])
export class CartItem {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'pk_cart_item' })
  id!: string

  @Column({ type: 'uuid' })
  cartId!: string

  @Column({ type: 'uuid' })
  productId!: string

  @Column({ type: 'int' })
  quantity!: number

  @ManyToOne(() => Cart, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'cart_id',
    foreignKeyConstraintName: 'fk_cart_item_cart',
  })
  cart!: Cart

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'product_id',
    foreignKeyConstraintName: 'fk_cart_item_product',
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
