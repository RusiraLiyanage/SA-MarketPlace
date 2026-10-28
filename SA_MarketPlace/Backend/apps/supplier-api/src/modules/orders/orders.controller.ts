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
  Res,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard, Roles, RolesGuard } from '@sa-marketplace/auth'
import { TPagingResDto } from '@sa-marketplace/common'
import { UserRoleType } from '@sa-marketplace/entities'
import type { Response } from 'express'
import {
  ApprovedSupplierGuard,
  SupplierRequest,
} from '../../guards/approved-supplier.guard'
import {
  CancelOrderDto,
  DispatchOrderDto,
  ListOrdersQueryDto,
  OrderNumberParamDto,
} from './orders.dto'
import { OrdersService } from './orders.service'
import { SellerOrderDetail, SellerOrderListItem } from './orders.typing'

// Approved sellers only, on the class so no route can be missed. The supplier
// comes from req.supplier, resolved from the token, never a URL or body (§7).
@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, ApprovedSupplierGuard)
@Roles(UserRoleType.seller)
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({
    summary:
      "This seller's orders: filter by status, search by order number, paged",
  })
  listOrders(
    @Req() req: SupplierRequest,
    @Query() query: ListOrdersQueryDto,
  ): Promise<TPagingResDto<SellerOrderListItem>> {
    return this.ordersService.listOrders(req.supplier, query)
  }

  @Get(':orderNumber')
  @ApiOperation({
    summary:
      "One of this seller's orders: summary, pick list and dispatch details",
  })
  getOrderDetail(
    @Req() req: SupplierRequest,
    @Param() params: OrderNumberParamDto,
  ): Promise<SellerOrderDetail> {
    return this.ordersService.getOrderDetail(req.supplier, params.orderNumber)
  }

  // The "all items picked" check is the frontend's: picks are not stored.
  @Post(':orderNumber/dispatch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Dispatch an order: record carrier and tracking (new or picking only)',
  })
  dispatchOrder(
    @Req() req: SupplierRequest,
    @Param() params: OrderNumberParamDto,
    @Body() dto: DispatchOrderDto,
  ): Promise<SellerOrderDetail> {
    return this.ordersService.dispatchOrder(
      req.supplier,
      params.orderNumber,
      dto,
    )
  }

  // The buyer is refunded in full and told; cancelling cannot be undone.
  @Post(':orderNumber/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel an order you cannot fulfil (new or picking only)',
  })
  cancelOrder(
    @Req() req: SupplierRequest,
    @Param() params: OrderNumberParamDto,
    @Body() dto: CancelOrderDto,
  ): Promise<SellerOrderDetail> {
    return this.ordersService.cancelOrder(req.supplier, params.orderNumber, dto)
  }

  // @Res() to stream the PDF with its own headers; thrown errors still reach the exception filter.
  @Get(':orderNumber/invoice')
  @ApiOperation({
    summary: 'Download the tax invoice PDF for a dispatched or delivered order',
  })
  async downloadInvoice(
    @Req() req: SupplierRequest,
    @Param() params: OrderNumberParamDto,
    @Res() res: Response,
  ): Promise<void> {
    const { filename, buffer } = await this.ordersService.getInvoicePdf(
      req.supplier,
      params.orderNumber,
    )
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    })
    res.send(buffer)
  }
}
