import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MailModule } from '@sa-marketplace/common'
import { SupplierProfile } from '@sa-marketplace/entities'
import { SuppliersController } from './suppliers.controller'
import { SuppliersService } from './suppliers.service'

@Module({
  imports: [TypeOrmModule.forFeature([SupplierProfile]), MailModule],
  controllers: [SuppliersController],
  providers: [SuppliersService],
})
export class SuppliersModule {}
