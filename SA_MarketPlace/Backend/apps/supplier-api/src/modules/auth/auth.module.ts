import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthAudience, AuthCoreModule } from '@sa-marketplace/auth'
import { SupplierProfile, UserRoleType } from '@sa-marketplace/entities'
import { ApprovedSupplierGuard } from '../../guards/approved-supplier.guard'
import { AuthController } from './auth.controller'
import { ProfileService } from './services/profile.service'
import { RegistrationService } from './services/registration.service'

@Module({
  imports: [
    AuthCoreModule.register({
      audience: AuthAudience.supplier,
      allowedRoles: [UserRoleType.seller],
      resetPasswordUrl: {
        envKey: 'SUPPLIER_RESET_URL',
        fallback: 'http://localhost:5174/reset-password',
      },
    }),
    // SupplierProfile is for ApprovedSupplierGuard, which the profile routes use.
    TypeOrmModule.forFeature([SupplierProfile]),
  ],
  controllers: [AuthController],
  providers: [RegistrationService, ProfileService, ApprovedSupplierGuard],
  // Re-exported so other seller modules can use UsersService without a second
  // AuthCoreModule.register (which would duplicate the strategies).
  exports: [AuthCoreModule],
})
export class AuthModule {}
