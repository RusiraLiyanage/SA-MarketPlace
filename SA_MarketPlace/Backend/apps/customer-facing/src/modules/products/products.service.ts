import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import {
  BusinessException,
  PagingMetaDto,
  TPagingResDto,
} from '@sa-marketplace/common'
import {
  Category,
  ListingStatus,
  Product,
  ProductImage,
  SupplierStatus,
} from '@sa-marketplace/entities'
import { Brackets, In, Repository, SelectQueryBuilder } from 'typeorm'
import { ListProductsQueryDto, PRODUCT_SORT_COLUMNS } from './products.dto'
import { ProductsError } from './products.exception'
import { toStockStatus } from './products.stock'
import {
  CategoryOption,
  PriceRange,
  ProductDetail,
  ProductImageView,
  ProductListItem,
} from './products.typing'

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,
  ) {}

  async listCategories(): Promise<CategoryOption[]> {
    const categories = await this.categoryRepository.find({
      select: { id: true, name: true, slug: true },
      order: { name: 'ASC' },
    })

    return categories.map(({ id, name, slug }) => ({ id, name, slug }))
  }

  async listProducts(
    query: ListProductsQueryDto,
  ): Promise<TPagingResDto<ProductListItem>> {
    const queryBuilder = this.visibleProductsQuery()

    if (query.categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', {
        categoryId: query.categoryId,
      })
    }

    if (query.priceRange === PriceRange.under20) {
      queryBuilder.andWhere('product.price < :priceMax', { priceMax: 20 })
    } else if (query.priceRange === PriceRange.from20To50) {
      queryBuilder.andWhere('product.price BETWEEN :priceMin AND :priceMax', {
        priceMin: 20,
        priceMax: 50,
      })
    } else if (query.priceRange === PriceRange.over50) {
      queryBuilder.andWhere('product.price > :priceMin', { priceMin: 50 })
    }

    const term = query.search?.trim()
    if (term) {
      // Escape LIKE wildcards so "%" or "_" in the search box match literally.
      const search = `%${term.replace(/[\\%_]/g, '\\$&')}%`
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('product.name ILIKE :search', { search }).orWhere(
            'product.description ILIKE :search',
            { search },
          )
        }),
      )
    }

    const sortColumn =
      PRODUCT_SORT_COLUMNS[
        query.orderField as keyof typeof PRODUCT_SORT_COLUMNS
      ]

    queryBuilder
      .orderBy(sortColumn, query.order)
      .addOrderBy('product.id', 'ASC')

    const [products, total] = await queryBuilder
      .skip(query.skip)
      .take(query.take)
      .getManyAndCount()

    const primaryImages = await this.findPrimaryImages(
      products.map((product) => product.id),
    )
    const data = products.map((product) =>
      this.toProductListItem(product, primaryImages.get(product.id) ?? null),
    )

    return { data, pagingMeta: new PagingMetaDto(query, total) }
  }

  findVisibleProduct(productId: string): Promise<Product | null> {
    return this.visibleProductsQuery()
      .andWhere('product.id = :productId', { productId })
      .getOne()
  }

  async getProduct(productId: string): Promise<ProductDetail> {
    const product = await this.findVisibleProduct(productId)

    // Hidden and missing products get the same 404, so hidden ones stay invisible.
    if (!product) {
      throw new BusinessException(
        ProductsError.PRODUCT_NOT_FOUND.code,
        ProductsError.PRODUCT_NOT_FOUND.message,
      )
    }

    const images = await this.productImageRepository.find({
      select: { path: true, altText: true, isPrimary: true },
      where: { productId: product.id },
      order: { sortOrder: 'ASC', id: 'ASC' },
    })
    const imageViews: ProductImageView[] = images.map((image) => ({
      path: image.path,
      altText: image.altText,
      isPrimary: image.isPrimary,
    }))

    return {
      ...this.toProductListItem(
        product,
        imageViews.find((image) => image.isPrimary) ?? null,
      ),
      description: product.description,
      sku: product.sku,
      brand: product.brand,
      manufacturer: product.manufacturer,
      packSize: product.packSize,
      certification: product.certification,
      storageConditions: product.storageConditions,
      shelfLifeMonths: product.shelfLifeMonths,
      images: imageViews,
    }
  }

  private visibleProductsQuery(): SelectQueryBuilder<Product> {
    const queryBuilder = this.productRepository.createQueryBuilder('product')

    queryBuilder
      .innerJoinAndSelect('product.category', 'category')
      .innerJoinAndSelect('product.supplierProfile', 'supplierProfile')

    queryBuilder
      .where('product.listingStatus = :listingStatus', {
        listingStatus: ListingStatus.published,
      })
      .andWhere('supplierProfile.status = :supplierStatus', {
        supplierStatus: SupplierStatus.approved,
      })

    return queryBuilder
  }

  // Shared by the list and the detail, so the list item shape never drifts.
  private toProductListItem(
    product: Product,
    primaryImage: ProductImageView | null,
  ): ProductListItem {
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      stockStatus: toStockStatus(product.quantity, product.lowStockThreshold),
      category: {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
      },
      primaryImage,
      supplierName: product.supplierProfile.businessName,
    }
  }

  private async findPrimaryImages(
    productIds: string[],
  ): Promise<Map<string, ProductImageView>> {
    if (productIds.length === 0) {
      return new Map()
    }

    const images = await this.productImageRepository.find({
      select: { productId: true, path: true, altText: true, isPrimary: true },
      where: { productId: In(productIds), isPrimary: true },
    })

    return new Map(
      images.map((image) => [
        image.productId,
        {
          path: image.path,
          altText: image.altText,
          isPrimary: image.isPrimary,
        },
      ]),
    )
  }
}
