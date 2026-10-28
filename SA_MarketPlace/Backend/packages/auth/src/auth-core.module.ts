import { DynamicModule, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ThrottlerModule } from '@nestjs/throttler'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MailModule } from '@sa-marketplace/common'
import { PasswordResetToken, User, UserRole } from '@sa-marketplace/entities'
import {
  AUTH_OPTIONS,
  AUTH_THROTTLE_LIMIT,
  AUTH_THROTTLE_TTL_SECONDS,
} from './auth.constant'
import { AuthService } from './auth.service'
import { AuthModuleOptions } from './auth.typing'
import { JwtStrategy } from './strategies/jwt.strategy'
import { LocalStrategy } from './strategies/local.strategy'
import { UsersService } from './users.service'

// Each app calls register() once with its own audience and allowed roles.
@Module({})
export class AuthCoreModule {
  static register(options: AuthModuleOptions): DynamicModule {
    return {
      module: AuthCoreModule,
      imports: [
        TypeOrmModule.forFeature([User, UserRole, PasswordResetToken]),
        MailModule,
        PassportModule,
        // Per-IP limit for the routes that guess passwords. ttl is milliseconds.
        ThrottlerModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => [
            {
              limit: Number(
                config.get<string>(
                  'AUTH_THROTTLE_LIMIT',
                  String(AUTH_THROTTLE_LIMIT),
                ),
              ),
              ttl:
                Number(
                  config.get<string>(
                    'AUTH_THROTTLE_TTL',
                    String(AUTH_THROTTLE_TTL_SECONDS),
                  ),
                ) * 1000,
            },
          ],
        }),
        JwtModule.registerAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            secret: config.getOrThrow<string>('JWT_SECRET'),
            signOptions: {
              expiresIn: config.get<string>('JWT_EXPIRES_IN', '15m'),
              audience: options.audience,
            },
          }),
        }),
      ],
      providers: [
        { provide: AUTH_OPTIONS, useValue: options },
        UsersService,
        AuthService,
        LocalStrategy,
        JwtStrategy,
      ],
      // ThrottlerModule so apps can put ThrottlerGuard on their auth routes.
      exports: [AuthService, UsersService, ThrottlerModule],
    }
  }
}
