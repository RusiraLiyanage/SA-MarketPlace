import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InvoiceModule } from '@sa-marketplace/common'
import { Delivery, Order, OrderItem, Payment } from '@sa-marketplace/entities'
import { CartModule } from '../cart/cart.module'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Delivery, Payment]),
    CartModule,
    InvoiceModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
