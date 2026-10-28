import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
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
import type { Response } from 'express'
import { ListOrdersQueryDto, OrderNumberParamDto } from './orders.dto'
import { OrdersService } from './orders.service'
import { OrderDetail, OrderSummary, ReorderResult } from './orders.typing'

// Signed-in buyers only, on the class so no route can be missed.
// The buyer comes from req.user.userId, never from the query (§7).
@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRoleType.buyer)
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: "List the signed-in buyer's orders, paginated" })
  listMyOrders(
    @Req() req: AuthRequest,
    @Query() query: ListOrdersQueryDto,
  ): Promise<TPagingResDto<OrderSummary>> {
    return this.ordersService.listMyOrders(req.user.userId, query)
  }

  @Get(':orderNumber')
  @ApiOperation({ summary: 'Get one order for the Order Detail screen' })
  getOrderDetail(
    @Req() req: AuthRequest,
    @Param() params: OrderNumberParamDto,
  ): Promise<OrderDetail> {
    return this.ordersService.getOrderDetail(
      req.user.userId,
      params.orderNumber,
    )
  }

  @Post(':orderNumber/reorder')
  @ApiOperation({
    summary: "Add this order's items back into the cart, at current prices",
  })
  reorder(
    @Req() req: AuthRequest,
    @Param() params: OrderNumberParamDto,
  ): Promise<ReorderResult> {
    return this.ordersService.reorder(req.user.userId, params.orderNumber)
  }

  // @Res() to stream the PDF with its own headers; thrown errors still reach the exception filter.
  @Get(':orderNumber/invoice')
  @ApiOperation({
    summary: 'Download the tax invoice PDF for a dispatched or delivered order',
  })
  async downloadInvoice(
    @Req() req: AuthRequest,
    @Param() params: OrderNumberParamDto,
    @Res() res: Response,
  ): Promise<void> {
    const { filename, buffer } = await this.ordersService.getInvoicePdf(
      req.user.userId,
      params.orderNumber,
    )
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    })
    res.send(buffer)
  }
}
