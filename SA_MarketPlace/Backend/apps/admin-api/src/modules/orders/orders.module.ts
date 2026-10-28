import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InvoiceModule } from '@sa-marketplace/common'
import { Delivery, Order, OrderItem, Payment } from '@sa-marketplace/entities'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'

@Module({
  imports: [
    InvoiceModule,
    TypeOrmModule.forFeature([Order, OrderItem, Delivery, Payment]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
