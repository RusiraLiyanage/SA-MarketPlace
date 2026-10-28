import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import {
  Category,
  Product,
  ProductImage,
  SupplierProfile,
} from '@sa-marketplace/entities'
import { ApprovedSupplierGuard } from '../../guards/approved-supplier.guard'
import { CatalogueController } from './catalogue.controller'
import { CatalogueService } from './catalogue.service'

@Module({
  // SupplierProfile is for ApprovedSupplierGuard, which the controller uses.
  imports: [
    TypeOrmModule.forFeature([
      SupplierProfile,
      Product,
      Category,
      ProductImage,
    ]),
  ],
  controllers: [CatalogueController],
  providers: [CatalogueService, ApprovedSupplierGuard],
})
export class CatalogueModule {}
