import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard, Roles, RolesGuard } from '@sa-marketplace/auth'
import { TPagingResDto } from '@sa-marketplace/common'
import { UserRoleType } from '@sa-marketplace/entities'
import {
  ApprovedSupplierGuard,
  SupplierRequest,
} from '../../guards/approved-supplier.guard'
import { ListDispatchQueueQueryDto } from './dashboard.dto'
import { DashboardService } from './dashboard.service'
import { DispatchQueueItem, SupplierOverview } from './dashboard.typing'

// Approved sellers only, on the class so no route can be missed. The supplier
// comes from req.supplier, resolved from the token — never a URL or body (§7).
@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, ApprovedSupplierGuard)
@Roles(UserRoleType.seller)
@Controller({ path: 'dashboard', version: '1' })
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // Dashboard cards, plus the count shown on the Catalogue badge.
  @Get('overview')
  @ApiOperation({
    summary:
      'New orders, dispatched today, active listings and what needs attention',
  })
  getOverview(@Req() req: SupplierRequest): Promise<SupplierOverview> {
    return this.dashboardService.getOverview(req.supplier)
  }

  // "Orders requiring dispatch", paged like the customer app's My Orders.
  @Get('orders-requiring-dispatch')
  @ApiOperation({
    summary: 'Orders not yet dispatched, oldest first, with SLA time left',
  })
  getOrdersRequiringDispatch(
    @Req() req: SupplierRequest,
    @Query() query: ListDispatchQueueQueryDto,
  ): Promise<TPagingResDto<DispatchQueueItem>> {
    return this.dashboardService.getOrdersRequiringDispatch(req.supplier, query)
  }
}
