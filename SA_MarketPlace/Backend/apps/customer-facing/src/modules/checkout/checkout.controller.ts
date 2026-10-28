import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  AuthRequest,
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from '@sa-marketplace/auth'
import { UserRoleType } from '@sa-marketplace/entities'
import { PlaceOrderDto } from './checkout.dto'
import { CheckoutService } from './checkout.service'
import { CheckoutResult } from './checkout.typing'

// Signed-in buyers only; cart comes from req.user.userId (§7). Never log the body: card details (§4.6).
@ApiTags('Checkout')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRoleType.buyer)
@Controller({ path: 'checkout', version: '1' })
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  @ApiOperation({
    summary: 'Place the order: one order per supplier, one payment',
  })
  placeOrder(
    @Req() req: AuthRequest,
    @Body() dto: PlaceOrderDto,
  ): Promise<CheckoutResult> {
    return this.checkoutService.placeOrder(req.user.userId, dto)
  }
}
