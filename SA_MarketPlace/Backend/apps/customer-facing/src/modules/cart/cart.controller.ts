import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { UserRoleType } from '@sa-marketplace/entities'
import {
  AddCartItemDto,
  CartItemParamDto,
  UpdateCartItemQuantityDto,
} from './cart.dto'
import { CartService } from './cart.service'
import { CartView } from './cart.typing'

// Signed-in buyers only, on the class so no route can be missed.
// Every method takes the cart from req.user.userId — never from a URL or body (§7).
@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRoleType.buyer)
@Controller({ path: 'cart', version: '1' })
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({
    summary: 'The signed-in buyer cart, with live prices and totals',
  })
  getCart(@Req() req: AuthRequest): Promise<CartView> {
    return this.cartService.getCart(req.user.userId)
  }

  @Post('items')
  @ApiOperation({
    summary: 'Add a product, or add to the quantity already in the cart',
  })
  addItem(
    @Req() req: AuthRequest,
    @Body() dto: AddCartItemDto,
  ): Promise<CartView> {
    return this.cartService.addItem(req.user.userId, dto)
  }

  @Patch('items/:productId')
  @ApiOperation({ summary: 'Set the quantity of one line; 0 removes it' })
  setItemQuantity(
    @Req() req: AuthRequest,
    @Param() params: CartItemParamDto,
    @Body() dto: UpdateCartItemQuantityDto,
  ): Promise<CartView> {
    return this.cartService.setItemQuantity(
      req.user.userId,
      params.productId,
      dto,
    )
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove one line from the cart' })
  removeItem(
    @Req() req: AuthRequest,
    @Param() params: CartItemParamDto,
  ): Promise<CartView> {
    return this.cartService.removeItem(req.user.userId, params.productId)
  }

  @Delete()
  @ApiOperation({ summary: 'Empty the cart' })
  clearCart(@Req() req: AuthRequest): Promise<CartView> {
    return this.cartService.clearCart(req.user.userId)
  }
}
