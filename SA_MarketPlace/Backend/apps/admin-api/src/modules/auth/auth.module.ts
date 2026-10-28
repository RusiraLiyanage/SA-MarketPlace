import { Module } from '@nestjs/common'
import { AuthAudience, AuthCoreModule } from '@sa-marketplace/auth'
import { UserRoleType } from '@sa-marketplace/entities'
import { AuthController } from './auth.controller'
import { ProfileService } from './services/profile.service'
import { RegistrationService } from './services/registration.service'

@Module({
  imports: [
    AuthCoreModule.register({
      audience: AuthAudience.admin,
      allowedRoles: [UserRoleType.admin],
      resetPasswordUrl: {
        envKey: 'ADMIN_RESET_URL',
        fallback: 'http://localhost:5175/reset-password',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [RegistrationService, ProfileService],
  // Re-exported so other admin modules can use UsersService without a second
  // AuthCoreModule.register (which would duplicate the strategies).
  exports: [AuthCoreModule],
})
export class AuthModule {}
