import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { UserStatus } from '@sa-marketplace/entities'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { AUTH_OPTIONS } from '../auth.constant'
import { AuthModuleOptions, AuthUser, JwtPayload } from '../auth.typing'
import { UsersService } from '../users.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @Inject(AUTH_OPTIONS) options: AuthModuleOptions,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      // Rejects tokens issued by another surface.
      audience: options.audience,
    })
  }

  // Runs only after the signature, expiry and audience are valid.
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.usersService.findById(payload.sub)

    // A logout bumps tokenVersion, so older tokens stop matching.
    if (
      !user ||
      user.status !== UserStatus.active ||
      user.tokenVersion !== payload.tokenVersion
    ) {
      throw new UnauthorizedException()
    }

    return {
      userId: user.id,
      email: user.email,
      roles: payload.roles,
      tokenVersion: user.tokenVersion,
    }
  }
}
