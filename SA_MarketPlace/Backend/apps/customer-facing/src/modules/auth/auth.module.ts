import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthAudience, AuthCoreModule } from '@sa-marketplace/auth'
import { Order, Organisation, UserRoleType } from '@sa-marketplace/entities'
import { AuthController } from './auth.controller'
import { ProfileService } from './services/profile.service'
import { RegistrationService } from './services/registration.service'

@Module({
  imports: [
    AuthCoreModule.register({
      audience: AuthAudience.customer,
      allowedRoles: [UserRoleType.buyer],
      resetPasswordUrl: {
        envKey: 'CUSTOMER_RESET_URL',
        fallback: 'http://localhost:5173/reset-password',
      },
    }),
    // User/UserRole already come from AuthCoreModule via UsersService; these
    // two are the marketplace-specific pieces ProfileService adds on top.
    TypeOrmModule.forFeature([Organisation, Order]),
  ],
  controllers: [AuthController],
  providers: [RegistrationService, ProfileService],
})
export class AuthModule {}
