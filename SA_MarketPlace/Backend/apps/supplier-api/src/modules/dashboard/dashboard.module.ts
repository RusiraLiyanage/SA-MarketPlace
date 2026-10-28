import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import {
  Delivery,
  Order,
  OrderItem,
  Product,
  SupplierProfile,
} from '@sa-marketplace/entities'
import { ApprovedSupplierGuard } from '../../guards/approved-supplier.guard'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'

@Module({
  imports: [
    // SupplierProfile is for ApprovedSupplierGuard, which the controller uses.
    TypeOrmModule.forFeature([
      SupplierProfile,
      Order,
      OrderItem,
      Delivery,
      Product,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService, ApprovedSupplierGuard],
})
export class DashboardModule {}
