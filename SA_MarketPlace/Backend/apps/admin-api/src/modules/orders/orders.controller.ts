import {
  Controller,
  Get,
  Header,
  Param,
  Query,
  Req,
  Res,
  StreamableFile,
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
import {
  ExportOrdersQueryDto,
  ListOrdersQueryDto,
  OrderNumberParamDto,
} from './orders.dto'
import { OrdersService } from './orders.service'
import { AdminOrderDetail, AdminOrderListItem } from './orders.typing'

// Admins only, on the class so no route can be missed. Every route here only reads.
@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRoleType.admin)
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({
    summary:
      'All orders: filter by payment and fulfilment, search by order number or customer, paged',
  })
  listOrders(
    @Query() query: ListOrdersQueryDto,
  ): Promise<TPagingResDto<AdminOrderListItem>> {
    return this.ordersService.listOrders(query)
  }

  // Declared before :orderNumber, or "export" would be read as an order number.
  @Get('export')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      "Export the filtered orders as a CSV file (the table's filters and sort, no paging)",
  })
  async exportOrders(
    @Req() req: AuthRequest,
    @Query() query: ExportOrdersQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { filename, stream } = await this.ordersService.exportOrders(
      req.user.userId,
      query,
    )
    // Stop reading the database if the client goes away mid-download.
    res.on('close', () => stream.destroy())
    return new StreamableFile(stream, {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="${filename}"`,
    })
  }

  @Get(':orderNumber')
  @ApiOperation({
    summary: 'One order: customer, supplier, items, delivery and tracking',
  })
  getOrderDetail(
    @Param() params: OrderNumberParamDto,
  ): Promise<AdminOrderDetail> {
    return this.ordersService.getOrderDetail(params.orderNumber)
  }

  // @Res() to stream the PDF with its own headers; thrown errors still reach the exception filter.
  @Get(':orderNumber/invoice')
  @ApiOperation({
    summary: 'Download the tax invoice PDF for a dispatched or delivered order',
  })
  async downloadInvoice(
    @Param() params: OrderNumberParamDto,
    @Res() res: Response,
  ): Promise<void> {
    const { filename, buffer } = await this.ordersService.getInvoicePdf(
      params.orderNumber,
    )
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    })
    res.send(buffer)
  }
}
