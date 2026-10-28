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
import { Organisation } from '../identity'

/** Buyer organisation's shelf stock (§6.17), up on delivery; distinct from product.quantity (supplier stock). */
@Entity('inventory')
@Unique('uq_inventory_organisation_id_product_id', [
  'organisationId',
  'productId',
])
@Check('ck_inventory_quantity_on_hand_non_negative', '"quantity_on_hand" >= 0')
@Index('idx_inventory_product_id', ['productId'])
export class Inventory {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'pk_inventory' })
  id!: string

  @Column({ type: 'uuid' })
  organisationId!: string

  @Column({ type: 'uuid' })
  productId!: string

  @Column({ type: 'int', default: 0 })
  quantityOnHand!: number

  @ManyToOne(() => Organisation, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'organisation_id',
    foreignKeyConstraintName: 'fk_inventory_organisation',
  })
  organisation!: Organisation

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'product_id',
    foreignKeyConstraintName: 'fk_inventory_product',
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
