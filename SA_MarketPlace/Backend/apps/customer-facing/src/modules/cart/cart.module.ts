import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Cart, CartItem } from '@sa-marketplace/entities'
import { ProductsModule } from '../products/products.module'
import { CartController } from './cart.controller'
import { CartService } from './cart.service'

@Module({
  imports: [TypeOrmModule.forFeature([Cart, CartItem]), ProductsModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
