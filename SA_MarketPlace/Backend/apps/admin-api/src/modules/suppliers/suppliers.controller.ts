import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  AuthRequest,
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from '@sa-marketplace/auth'
import { TPagingResDto } from '@sa-marketplace/common'
import { UserRoleType } from '@sa-marketplace/entities'
import {
  ListSuppliersQueryDto,
  RejectSupplierDto,
  SupplierIdParamDto,
} from './suppliers.dto'
import { SuppliersService } from './suppliers.service'
import {
  SupplierApplicationCounts,
  SupplierApplicationDetail,
  SupplierApplicationListItem,
} from './suppliers.typing'

// Admins only, on the class so no route can be missed.
@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRoleType.admin)
@Controller({ path: 'suppliers', version: '1' })
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @ApiOperation({
    summary:
      'Supplier applications: filter by status, search by business name or ABN, paged',
  })
  listSuppliers(
    @Query() query: ListSuppliersQueryDto,
  ): Promise<TPagingResDto<SupplierApplicationListItem>> {
    return this.suppliersService.listSuppliers(query)
  }

  // Its own route because the sidebar badge needs the count on pages that have no list.
  @Get('summary')
  @ApiOperation({
    summary: 'How many applications there are, in total and per status',
  })
  getSummary(): Promise<SupplierApplicationCounts> {
    return this.suppliersService.getSummary()
  }

  // Declared after 'summary' so the literal route wins over the :supplierId param.
  @Get(':supplierId')
  @ApiOperation({
    summary: 'One application: business details, primary contact and status',
  })
  getApplication(
    @Param() params: SupplierIdParamDto,
  ): Promise<SupplierApplicationDetail> {
    return this.suppliersService.getApplication(params.supplierId)
  }

  @Post(':supplierId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Approve a pending application; its published listings become visible to buyers',
  })
  approve(
    @Req() req: AuthRequest,
    @Param() params: SupplierIdParamDto,
  ): Promise<SupplierApplicationDetail> {
    return this.suppliersService.approve(req.user.userId, params.supplierId)
  }

  @Post(':supplierId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject a pending application with a reason the applicant sees',
  })
  reject(
    @Req() req: AuthRequest,
    @Param() params: SupplierIdParamDto,
    @Body() dto: RejectSupplierDto,
  ): Promise<SupplierApplicationDetail> {
    return this.suppliersService.reject(req.user.userId, params.supplierId, dto)
  }
}
