import { Invoice, Payment } from './billing'
import { Category, Product, ProductImage } from './catalogue'
import { Carrier, Delivery } from './fulfilment'
import {
  Organisation,
  PasswordResetToken,
  SupplierProfile,
  User,
  UserRole,
} from './identity'
import { Inventory } from './inventory'
import { Cart, CartItem, Order, OrderItem } from './ordering'

/** Every entity, in FK order. Explicit list, not a glob: globs resolve differently under ts-node and dist. */
export const ALL_ENTITIES = [
  // identity
  Organisation,
  User,
  UserRole,
  SupplierProfile,
  PasswordResetToken,
  // catalogue
  Category,
  Product,
  ProductImage,
  // ordering
  Cart,
  CartItem,
  Order,
  OrderItem,
  // billing
  Payment,
  Invoice,
  // fulfilment
  Carrier,
  Delivery,
  // inventory
  Inventory,
]
