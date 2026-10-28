import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { BusinessException } from '@sa-marketplace/common'
import { Cart, CartItem, ListingStatus } from '@sa-marketplace/entities'
import { DataSource, EntityManager, Repository } from 'typeorm'
import { fromCents, gstIncludedInCents, toCents } from '../../utils/money'
import { ProductsService } from '../products/products.service'
import { toStockStatus } from '../products/products.stock'
import { isProductOrderable } from '../products/products.visibility'
import { AddCartItemDto, UpdateCartItemQuantityDto } from './cart.dto'
import { CartError } from './cart.exception'
import { CartItemView, CartView } from './cart.typing'

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    private readonly productsService: ProductsService,
    private readonly dataSource: DataSource,
  ) {}

  // GET cart: lines at live prices, plus the summary checkout reuses.
  async getCart(userId: string): Promise<CartView> {
    const cart = await this.getOrCreateCart(userId)

    const items = await this.cartItemRepository.find({
      where: { cartId: cart.id },
      relations: { product: { supplierProfile: true } },
      order: { createdAt: 'ASC', id: 'ASC' },
    })

    return this.buildCartView(cart, items)
  }

  // POST cart/items — the "Add to cart" button. Adds to any existing line.
  async addItem(userId: string, dto: AddCartItemDto): Promise<CartView> {
    const cart = await this.getOrCreateCart(userId)

    const product = await this.productsService.findVisibleProduct(dto.productId)
    if (!product) {
      throw new BusinessException(
        CartError.PRODUCT_NOT_FOUND.code,
        CartError.PRODUCT_NOT_FOUND.message,
      )
    }

    await this.withCartLock(cart.id, async (manager) => {
      const cartItems = manager.getRepository(CartItem)

      const existing = await cartItems.findOneBy({
        cartId: cart.id,
        productId: product.id,
      })

      const quantity = (existing?.quantity ?? 0) + (dto.quantity ?? 1)

      if (quantity > product.quantity) {
        throw new BusinessException(
          CartError.INSUFFICIENT_STOCK.code,
          `${CartError.INSUFFICIENT_STOCK.message} (${product.quantity} available)`,
        )
      }

      if (existing) {
        await cartItems.update(existing.id, { quantity })
      } else {
        await cartItems.insert({
          cartId: cart.id,
          productId: product.id,
          quantity,
        })
      }
    })

    return await this.getCart(userId)
  }

  // PATCH cart/items/:productId: sets the absolute quantity.
  async setItemQuantity(
    userId: string,
    productId: string,
    dto: UpdateCartItemQuantityDto,
  ): Promise<CartView> {
    const cart = await this.getOrCreateCart(userId)

    const product =
      dto.quantity > 0
        ? await this.productsService.findVisibleProduct(productId)
        : null

    await this.withCartLock(cart.id, async (manager) => {
      const cartItems = manager.getRepository(CartItem)
      const existing = await cartItems.findOneBy({ cartId: cart.id, productId })

      if (!existing) {
        if (dto.quantity === 0) {
          return
        }
        throw new BusinessException(
          CartError.ITEM_NOT_IN_CART.code,
          CartError.ITEM_NOT_IN_CART.message,
        )
      }

      if (dto.quantity === 0) {
        await cartItems.delete(existing.id)
        return
      }

      if (!product) {
        throw new BusinessException(
          CartError.PRODUCT_NOT_FOUND.code,
          CartError.PRODUCT_NOT_FOUND.message,
        )
      }
      if (dto.quantity > product.quantity) {
        throw new BusinessException(
          CartError.INSUFFICIENT_STOCK.code,
          `${CartError.INSUFFICIENT_STOCK.message} (${product.quantity} available)`,
        )
      }
      await cartItems.update(existing.id, { quantity: dto.quantity })
    })

    return await this.getCart(userId)
  }

  // DELETE cart/items/:productId — the bin icon on one line.
  async removeItem(userId: string, productId: string): Promise<CartView> {
    const cart = await this.getOrCreateCart(userId)

    await this.cartItemRepository.delete({ cartId: cart.id, productId })

    return await this.getCart(userId)
  }

  // DELETE cart — empty the cart.
  async clearCart(userId: string): Promise<CartView> {
    const cart = await this.getOrCreateCart(userId)

    await this.cartItemRepository.delete({ cartId: cart.id })

    return await this.getCart(userId)
  }

  // One cart per user (UNIQUE user_id). Every endpoint starts here.
  private async getOrCreateCart(userId: string): Promise<Cart> {
    const existing = await this.cartRepository.findOneBy({ userId })
    if (existing) {
      return existing
    }

    await this.cartRepository
      .createQueryBuilder()
      .insert()
      .values({ userId })
      .orIgnore()
      .execute()

    return await this.cartRepository.findOneByOrFail({ userId })
  }

  private withCartLock<T>(
    cartId: string,
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Cart).findOne({
        where: { id: cartId },
        lock: { mode: 'pessimistic_write' },
      })
      return await work(manager)
    })
  }

  // Shared by every endpoint: they all answer with the whole cart.
  private buildCartView(cart: Cart, items: CartItem[]): CartView {
    const lines = items.map((item) => {
      const { product } = item
      const lineCents = toCents(product.price) * item.quantity
      const view: CartItemView = {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        lineTotal: fromCents(lineCents),
        stockStatus: toStockStatus(product.quantity, product.lowStockThreshold),
        stockOnHand: product.quantity,
        unavailableReason: this.getUnavailableReason(item),
        supplierProfileId: product.supplierProfile.id,
        supplierName: product.supplierProfile.businessName,
      }
      return { view, lineCents }
    })

    const orderable = lines.filter(
      (line) => line.view.unavailableReason === null,
    )
    const totalCents = orderable.reduce((sum, line) => sum + line.lineCents, 0)

    return {
      cartId: cart.id,
      items: lines.map((line) => line.view),
      summary: {
        itemCount: orderable.reduce((sum, line) => sum + line.view.quantity, 0),
        total: fromCents(totalCents),
        gstIncluded: fromCents(gstIncludedInCents(totalCents)),
      },
    }
  }

  // Why a line cannot be ordered right now, or null when it can.
  private getUnavailableReason(item: CartItem): string | null {
    const { product } = item

    // Same rule the catalogue and checkout use — see products.visibility.ts.
    if (!isProductOrderable(product)) {
      return product.listingStatus !== ListingStatus.published
        ? 'This product is no longer available'
        : 'This supplier is not currently available'
    }
    if (product.quantity <= 0) {
      return 'Out of stock'
    }
    if (item.quantity > product.quantity) {
      return `Only ${product.quantity} left in stock`
    }
    return null
  }
}
