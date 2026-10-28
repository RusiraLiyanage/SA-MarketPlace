import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard, Roles, RolesGuard } from '@sa-marketplace/auth'
import { TPagingResDto } from '@sa-marketplace/common'
import { UserRoleType } from '@sa-marketplace/entities'
import { ListProductsQueryDto, ProductIdParamDto } from './products.dto'
import { ProductsService } from './products.service'
import {
  CategoryOption,
  ProductDetail,
  ProductListItem,
} from './products.typing'

// Signed-in buyers only (ADR 0021). On the class, so no route can be missed.
@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRoleType.buyer)
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products with search, filters and paging' })
  listProducts(
    @Query() query: ListProductsQueryDto,
  ): Promise<TPagingResDto<ProductListItem>> {
    return this.productsService.listProducts(query)
  }

  // Declared before ':productId' so "categories" is not read as a product id.
  @Get('categories')
  @ApiOperation({ summary: 'List categories for the filter chips' })
  listCategories(): Promise<CategoryOption[]> {
    return this.productsService.listCategories()
  }

  @Get(':productId')
  @ApiOperation({ summary: 'Get one product for the detail page' })
  getProduct(@Param() params: ProductIdParamDto): Promise<ProductDetail> {
    return this.productsService.getProduct(params.productId)
  }
}
