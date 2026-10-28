import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SupplierProfile } from '@sa-marketplace/entities'
import { AuthModule } from '../auth/auth.module'
import { ApplicationController } from './application.controller'
import { ApplicationService } from './application.service'

@Module({
  // AuthModule re-exports AuthCoreModule, which supplies UsersService.
  imports: [TypeOrmModule.forFeature([SupplierProfile]), AuthModule],
  controllers: [ApplicationController],
  providers: [ApplicationService],
})
export class ApplicationModule {}
