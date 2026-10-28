import * as path from 'path'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { BusinessException, PagingMetaDto } from '@sa-marketplace/common'
import {
  Category,
  ListingStatus,
  Product,
  ProductImage,
} from '@sa-marketplace/entities'
import { DataSource, In, QueryFailedError, Repository } from 'typeorm'
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity'
import { SupplierContext } from '../../guards/approved-supplier.guard'
import {
  CATALOGUE_SORT_COLUMNS,
  CreateProductDto,
  ListCatalogueQueryDto,
  UpdateProductDto,
} from './catalogue.dto'
import {
  PRODUCT_IMAGE_EXTENSIONS,
  PRODUCT_IMAGE_LIMITS,
} from './catalogue.constant'
import { CatalogueError } from './catalogue.exception'
import { detectImageType } from './image-type'
import {
  blankToNull,
  toCategoryOption,
  toProductDetail,
} from './catalogue.mapper'
import { formatPrice } from './price'
import {
  removeProductImageFiles,
  StoredImage,
  writeProductImageFiles,
} from './product-image-files'
import {
  CatalogueListItem,
  CatalogueProductDetail,
  CatalogueListResponse,
  CatalogueProductEditView,
  CategoryOption,
  CategoryTreeItem,
  LowStockProduct,
} from './catalogue.typing'

const SKU_CONSTRAINT = 'uq_product_supplier_profile_id_sku'

// Postgres 23505 on the per-seller SKU constraint, and nothing else.
const isSkuViolation = (error: unknown): boolean => {
  if (!(error instanceof QueryFailedError)) return false
  const { code, constraint } = error.driverError as {
    code?: string
    constraint?: string
  }
  return code === '23505' && constraint === SKU_CONSTRAINT
}

// The signed-in seller's own listings. Every query is scoped by supplier.profileId,
// resolved from the token by ApprovedSupplierGuard, never from a URL or body (§7).
@Injectable()
export class CatalogueService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,
    private readonly dataSource: DataSource,
  ) {}

  // GET /catalogue: the catalogue table, filtered, searched and paged, plus the low-stock banner.
  async listCatalogue(
    supplier: SupplierContext,
    query: ListCatalogueQueryDto,
  ): Promise<CatalogueListResponse> {
    // Step 1: this seller's products, every listing status.
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .where('product.supplierProfileId = :profileId', {
        profileId: supplier.profileId,
      })

    // Step 2: if query.status is set, keep products with that listingStatus.
    if (query.status) {
      queryBuilder.andWhere('product.listingStatus = :status', {
        status: query.status,
      })
    }

    // Step 3: if query.search is set, match the name or SKU case-insensitively, escaping LIKE wildcards.
    const term = query.search?.trim()
    if (term) {
      const search = `%${term.replace(/[\\%_]/g, '\\$&')}%`
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.sku ILIKE :search)',
        { search },
      )
    }

    // Step 4: sort by the allow-listed column, product.id as tie-break, and page with getManyAndCount().
    const sortColumn =
      CATALOGUE_SORT_COLUMNS[
        query.orderField as keyof typeof CATALOGUE_SORT_COLUMNS
      ]

    const [products, total] = await queryBuilder
      .orderBy(sortColumn, query.order)
      .addOrderBy('product.id', 'ASC')
      .skip(query.skip)
      .take(query.take)
      .getManyAndCount()

    // Step 5: lowStock: this seller's published products at or below lowStockThreshold, least stock first; ignores query.
    const lowStockProducts = await this.productRepository
      .createQueryBuilder('product')
      .where('product.supplierProfileId = :profileId', {
        profileId: supplier.profileId,
      })
      .andWhere('product.listingStatus = :published', {
        published: ListingStatus.published,
      })
      .andWhere('product.quantity <= product.lowStockThreshold')
      .orderBy('product.quantity', 'ASC')
      .addOrderBy('product.name', 'ASC')
      .addOrderBy('product.id', 'ASC')
      .getMany()

    // Step 6: map each product to a CatalogueListItem.
    const data = products.map(
      (product): CatalogueListItem => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        quantity: product.quantity,
        listingStatus: product.listingStatus,
      }),
    )
    const lowStock = lowStockProducts.map(
      (product): LowStockProduct => ({
        id: product.id,
        name: product.name,
        quantity: product.quantity,
      }),
    )

    // Step 7: return { data, pagingMeta: new PagingMetaDto(query, total), lowStock }.
    return { data, pagingMeta: new PagingMetaDto(query, total), lowStock }
  }

  // POST /catalogue: Save draft or Publish a new listing for this seller, with its images.
  async createProduct(
    supplier: SupplierContext,
    dto: CreateProductDto,
    images: Express.Multer.File[],
  ): Promise<CatalogueProductDetail> {
    // Step 1: each image's first bytes must be JPEG, PNG or WebP (the interceptor already capped count and size), else ECB001 INVALID_IMAGE.
    const imageFiles = this.toImageFiles(images)

    // Step 2: dto.categoryId must be an existing category, else ECB001 CATEGORY_NOT_FOUND.
    await this.assertCategoryExists(dto.categoryId)

    let stored: StoredImage[] = []
    try {
      // Step 3: in one transaction, insert the product (supplierProfileId from `supplier`, never the body; blank optional text becomes null), then each image: write it to storage/products/<random>.<ext> and insert its product_image row (first is primary, sortOrder is its position).
      const saved = await this.dataSource.transaction(async (manager) => {
        const product = await manager.save(Product, {
          supplierProfileId: supplier.profileId,
          categoryId: dto.categoryId,
          name: dto.name,
          description: blankToNull(dto.description),
          sku: dto.sku,
          price: formatPrice(dto.price),
          quantity: dto.quantity,
          lowStockThreshold: dto.lowStockThreshold,
          listingStatus: dto.listingStatus,
          brand: blankToNull(dto.brand),
          manufacturer: blankToNull(dto.manufacturer),
          packSize: blankToNull(dto.packSize),
          certification: blankToNull(dto.certification),
        })

        stored = await writeProductImageFiles(imageFiles)
        const imageRows = await manager.save(
          ProductImage,
          stored.map((file, position) => ({
            productId: product.id,
            path: file.path,
            altText: product.name,
            sortOrder: position,
            isPrimary: position === 0,
          })),
        )
        return { product, imageRows }
      })

      // Step 4: return the saved product with its images, as a CatalogueProductDetail.
      return toProductDetail(saved.product, saved.imageRows)
    } catch (error) {
      // Step 5: a unique violation on (supplierProfileId, sku) is ECB409 SKU_ALREADY_EXISTS (catching it, not pre-checking, covers a race); on any failure delete the files already written.
      await removeProductImageFiles(stored)
      throw this.translateWriteError(error)
    }
  }

  // GET /catalogue/categories: the Category and Sub-category dropdowns, for both forms.
  async listCategories(): Promise<CategoryTreeItem[]> {
    // Step 1: every category, ordered by name.
    const categories = await this.categoryRepository.find({
      order: { name: 'ASC', id: 'ASC' },
    })

    // Step 2: top-level ones (no parentId), each with its children (the sub-categories) under it.
    const childrenByParent = new Map<string, CategoryOption[]>()
    for (const category of categories) {
      if (!category.parentId) continue
      const siblings = childrenByParent.get(category.parentId) ?? []
      siblings.push(toCategoryOption(category))
      childrenByParent.set(category.parentId, siblings)
    }

    // Step 3: return the tree.
    return categories
      .filter((category) => !category.parentId)
      .map((category) => ({
        ...toCategoryOption(category),
        children: childrenByParent.get(category.id) ?? [],
      }))
  }

  // GET /catalogue/:productId: the edit form's data.
  async getProduct(
    supplier: SupplierContext,
    productId: string,
  ): Promise<CatalogueProductEditView> {
    // Step 1: find the product among THIS seller's products; none is ECB404 PRODUCT_NOT_FOUND.
    const product = await this.productRepository.findOneBy({
      id: productId,
      supplierProfileId: supplier.profileId,
    })
    if (!product) {
      throw this.productNotFound()
    }

    // Step 2: split its category: a child shows as subCategory under its parent, a top-level one has no subCategory.
    const [category, images] = await Promise.all([
      this.categoryRepository.findOneOrFail({
        where: { id: product.categoryId },
        relations: { parent: true },
      }),
      // Step 3: load its images ordered by sortOrder (the first is primary).
      this.productImageRepository.find({
        where: { productId: product.id },
        order: { sortOrder: 'ASC', id: 'ASC' },
      }),
    ])
    const topLevel = category.parent ?? category

    // Step 4: map to CatalogueProductEditView.
    return {
      ...toProductDetail(product, images),
      category: toCategoryOption(topLevel),
      subCategory: category.parent ? toCategoryOption(category) : null,
    }
  }

  // PATCH /catalogue/:productId: Save draft or Publish, with image changes; also the inline price and stock cells.
  async updateProduct(
    supplier: SupplierContext,
    productId: string,
    dto: UpdateProductDto,
    images: Express.Multer.File[],
  ): Promise<CatalogueProductEditView> {
    // Step 1: each new image's first bytes must be JPEG, PNG or WebP, else ECB001 INVALID_IMAGE.
    const imageFiles = this.toImageFiles(images)

    let stored: StoredImage[] = []
    let removedImages: ProductImage[] = []
    try {
      removedImages = await this.dataSource.transaction(async (manager) => {
        // Step 2: find the product among THIS seller's products, locking its row so concurrent edits queue; none is ECB404 PRODUCT_NOT_FOUND.
        const product = await manager.findOne(Product, {
          where: { id: productId, supplierProfileId: supplier.profileId },
          lock: { mode: 'pessimistic_write' },
        })
        if (!product) {
          throw this.productNotFound()
        }

        // Step 3: a retired product cannot be edited: ECB409 PRODUCT_RETIRED.
        if (product.listingStatus === ListingStatus.retired) {
          throw new BusinessException(
            CatalogueError.PRODUCT_RETIRED.code,
            CatalogueError.PRODUCT_RETIRED.message,
          )
        }

        // Step 4: if dto.categoryId is set it must exist, else ECB001 CATEGORY_NOT_FOUND.
        if (dto.categoryId !== undefined) {
          await this.assertCategoryExists(dto.categoryId)
        }

        // Step 5: every removeImageIds entry must be one of this product's images (else ECB001 IMAGE_NOT_FOUND), and kept plus new images must be at most 4 (else ECB001 TOO_MANY_IMAGES).
        const existing = await manager.find(ProductImage, {
          where: { productId },
          order: { sortOrder: 'ASC', id: 'ASC' },
        })
        const removeIds = new Set(dto.removeImageIds ?? [])
        const removed = existing.filter((image) => removeIds.has(image.id))
        if (removed.length !== removeIds.size) {
          throw new BusinessException(
            CatalogueError.IMAGE_NOT_FOUND.code,
            CatalogueError.IMAGE_NOT_FOUND.message,
          )
        }
        const kept = existing.filter((image) => !removeIds.has(image.id))
        if (kept.length + imageFiles.length > PRODUCT_IMAGE_LIMITS.MAX_COUNT) {
          throw new BusinessException(
            CatalogueError.TOO_MANY_IMAGES.code,
            CatalogueError.TOO_MANY_IMAGES.message,
          )
        }

        // Step 6: judge the result, not the fields sent: if the final status is published, the final description must be non-empty, else ECB001 DESCRIPTION_REQUIRED.
        const finalStatus = dto.listingStatus ?? product.listingStatus
        const finalDescription =
          dto.description === undefined ? product.description : dto.description
        if (finalStatus === ListingStatus.published && !finalDescription) {
          throw new BusinessException(
            CatalogueError.DESCRIPTION_REQUIRED.code,
            CatalogueError.DESCRIPTION_REQUIRED.message,
          )
        }

        // Step 7: apply only the fields sent (blank text becomes null), delete the removed image rows, write the new files and insert their rows after the kept ones, then renumber sortOrder and make only the first image primary.
        // Fields not sent stay undefined, which the update skips.
        const changes: QueryDeepPartialEntity<Product> = {
          name: dto.name,
          description: dto.description,
          sku: dto.sku,
          price: dto.price,
          categoryId: dto.categoryId,
          quantity: dto.quantity,
          lowStockThreshold: dto.lowStockThreshold,
          listingStatus: dto.listingStatus,
          brand: dto.brand,
          manufacturer: dto.manufacturer,
          packSize: dto.packSize,
          certification: dto.certification,
        }

        const touched =
          Object.values(changes).some((value) => value !== undefined) ||
          removed.length > 0 ||
          imageFiles.length > 0
        if (!touched) return []

        await manager.update(
          Product,
          { id: productId },
          { ...changes, updatedAt: () => 'CURRENT_TIMESTAMP' },
        )

        // Alt text follows the product name.
        if (dto.name !== undefined) {
          await manager.update(
            ProductImage,
            { productId },
            { altText: dto.name },
          )
        }
        if (removed.length > 0) {
          await manager.delete(ProductImage, {
            id: In(removed.map((image) => image.id)),
          })
        }

        stored = await writeProductImageFiles(imageFiles)
        await manager.save(
          ProductImage,
          stored.map((file, index) => ({
            productId,
            path: file.path,
            altText: dto.name ?? product.name,
            sortOrder: kept.length + index,
            isPrimary: kept.length + index === 0,
          })),
        )

        for (const [position, image] of kept.entries()) {
          const isPrimary = position === 0
          if (image.sortOrder !== position || image.isPrimary !== isPrimary) {
            await manager.update(
              ProductImage,
              { id: image.id },
              { sortOrder: position, isPrimary },
            )
          }
        }
        return removed
      })
    } catch (error) {
      // Step 8: a unique violation on (supplierProfileId, sku) is ECB409 SKU_ALREADY_EXISTS; on failure delete the new files.
      await removeProductImageFiles(stored)
      throw this.translateWriteError(error)
    }

    // Step 9: after the commit, delete the removed files (best effort), then return the updated product as in getProduct.
    await removeProductImageFiles(
      removedImages.map((image) => ({
        filename: path.basename(image.path),
        path: image.path,
      })),
    )
    return await this.getProduct(supplier, productId)
  }

  // Another seller's product looks identical to a missing one (ADR 0025).
  private productNotFound(): BusinessException {
    return new BusinessException(
      CatalogueError.PRODUCT_NOT_FOUND.code,
      CatalogueError.PRODUCT_NOT_FOUND.message,
    )
  }

  private async assertCategoryExists(categoryId: string): Promise<void> {
    if (!(await this.categoryRepository.existsBy({ id: categoryId }))) {
      throw new BusinessException(
        CatalogueError.CATEGORY_NOT_FOUND.code,
        CatalogueError.CATEGORY_NOT_FOUND.message,
      )
    }
  }

  // The type comes from the bytes, never the name or declared type; the file keeps that extension.
  private toImageFiles(
    images: Express.Multer.File[],
  ): { buffer: Buffer; extension: string }[] {
    return images.map((image) => {
      const type = detectImageType(image.buffer)
      if (!type) {
        throw new BusinessException(
          CatalogueError.INVALID_IMAGE.code,
          CatalogueError.INVALID_IMAGE.message,
        )
      }
      return { buffer: image.buffer, extension: PRODUCT_IMAGE_EXTENSIONS[type] }
    })
  }

  private translateWriteError(error: unknown): unknown {
    if (isSkuViolation(error)) {
      return new BusinessException(
        CatalogueError.SKU_ALREADY_EXISTS.code,
        CatalogueError.SKU_ALREADY_EXISTS.message,
      )
    }
    return error
  }

  // POST /catalogue/:productId/retire: take a product off sale for good; it is kept, never deleted.
  async retireProduct(
    supplier: SupplierContext,
    productId: string,
  ): Promise<CatalogueProductEditView> {
    // Step 1: find the product among THIS seller's products; none is ECB404 PRODUCT_NOT_FOUND.
    const product = await this.productRepository.findOneBy({
      id: productId,
      supplierProfileId: supplier.profileId,
    })
    if (!product) {
      throw this.productNotFound()
    }

    // Step 2: one already retired is ECB409 PRODUCT_ALREADY_RETIRED.
    if (product.listingStatus === ListingStatus.retired) {
      throw this.alreadyRetired()
    }

    // Step 3: set only the status, and only if it is still draft or published (else ECB409): the condition is the real guard, so a double click or a racing edit cannot both win. Images, stock and past orders are left as they are.
    const retired = await this.productRepository.update(
      {
        id: productId,
        supplierProfileId: supplier.profileId,
        listingStatus: In([ListingStatus.draft, ListingStatus.published]),
      },
      { listingStatus: ListingStatus.retired },
    )
    if (retired.affected !== 1) {
      throw this.alreadyRetired()
    }

    // Step 4: return the retired product as in getProduct.
    return await this.getProduct(supplier, productId)
  }

  private alreadyRetired(): BusinessException {
    return new BusinessException(
      CatalogueError.PRODUCT_ALREADY_RETIRED.code,
      CatalogueError.PRODUCT_ALREADY_RETIRED.message,
    )
  }
}
