import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InvoiceModule, MailModule } from '@sa-marketplace/common'
import {
  Carrier,
  Delivery,
  Order,
  OrderItem,
  SupplierProfile,
} from '@sa-marketplace/entities'
import { ApprovedSupplierGuard } from '../../guards/approved-supplier.guard'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'

@Module({
  // SupplierProfile is for ApprovedSupplierGuard, which the controller uses.
  imports: [
    MailModule,
    InvoiceModule,
    TypeOrmModule.forFeature([
      SupplierProfile,
      Order,
      OrderItem,
      Delivery,
      Carrier,
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, ApprovedSupplierGuard],
})
export class OrdersModule {}
