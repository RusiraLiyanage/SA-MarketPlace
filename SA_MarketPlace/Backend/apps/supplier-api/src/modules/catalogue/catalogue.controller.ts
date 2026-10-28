import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { JwtAuthGuard, Roles, RolesGuard } from '@sa-marketplace/auth'
import { UserRoleType } from '@sa-marketplace/entities'
import {
  ApprovedSupplierGuard,
  SupplierRequest,
} from '../../guards/approved-supplier.guard'
import {
  CreateProductDto,
  ListCatalogueQueryDto,
  ProductIdParamDto,
  UpdateProductDto,
} from './catalogue.dto'
import { CatalogueService } from './catalogue.service'
import { ProductImagesInterceptor } from './product-images.interceptor'
import {
  CatalogueListResponse,
  CatalogueProductDetail,
  CatalogueProductEditView,
  CategoryTreeItem,
} from './catalogue.typing'

// Approved sellers only, on the class so no route can be missed. The supplier
// comes from req.supplier, resolved from the token, never a URL or body (§7).
@ApiTags('Catalogue')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, ApprovedSupplierGuard)
@Roles(UserRoleType.seller)
@Controller({ path: 'catalogue', version: '1' })
export class CatalogueController {
  constructor(private readonly catalogueService: CatalogueService) {}

  @Get()
  @ApiOperation({
    summary:
      "This seller's listings: filter by status, search by name or SKU, paged, plus low-stock warnings",
  })
  listCatalogue(
    @Req() req: SupplierRequest,
    @Query() query: ListCatalogueQueryDto,
  ): Promise<CatalogueListResponse> {
    return this.catalogueService.listCatalogue(req.supplier, query)
  }

  // Declared before :productId, or "categories" would be read as a product id.
  @Get('categories')
  @ApiOperation({
    summary: 'Categories with their sub-categories, for the product forms',
  })
  listCategories(): Promise<CategoryTreeItem[]> {
    return this.catalogueService.listCategories()
  }

  @Get(':productId')
  @ApiOperation({
    summary: "One of this seller's products, as the edit form shows it",
  })
  getProduct(
    @Req() req: SupplierRequest,
    @Param() params: ProductIdParamDto,
  ): Promise<CatalogueProductEditView> {
    return this.catalogueService.getProduct(req.supplier, params.productId)
  }

  // Multipart so the images travel with the fields; the interceptor caps their count and size.
  @Post()
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary:
      'Add a product as a draft or published listing, with up to 4 images (201)',
  })
  @UseInterceptors(ProductImagesInterceptor)
  createProduct(
    @Req() req: SupplierRequest,
    @Body() dto: CreateProductDto,
    @UploadedFiles() images: Express.Multer.File[] = [],
  ): Promise<CatalogueProductDetail> {
    return this.catalogueService.createProduct(req.supplier, dto, images)
  }

  // Send only what changed: a full-form save of an old stock count would overwrite sales made since.
  @Patch(':productId')
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary:
      'Update a product: any fields, plus images to add (files) and remove (removeImageIds)',
  })
  @UseInterceptors(ProductImagesInterceptor)
  updateProduct(
    @Req() req: SupplierRequest,
    @Param() params: ProductIdParamDto,
    @Body() dto: UpdateProductDto,
    @UploadedFiles() images: Express.Multer.File[] = [],
  ): Promise<CatalogueProductEditView> {
    return this.catalogueService.updateProduct(
      req.supplier,
      params.productId,
      dto,
      images,
    )
  }

  // Final in Phase 1: a retired product is read-only and cannot be published again.
  @Post(':productId/retire')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Retire a draft or published product: off sale for good, kept for history',
  })
  retireProduct(
    @Req() req: SupplierRequest,
    @Param() params: ProductIdParamDto,
  ): Promise<CatalogueProductEditView> {
    return this.catalogueService.retireProduct(req.supplier, params.productId)
  }
}
