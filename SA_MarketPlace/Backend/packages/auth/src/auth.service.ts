import { createHash, randomBytes } from 'crypto'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import {
  AppError,
  BusinessException,
  MailService,
  RESET_PASSWORD_SUBJECT,
  resetPasswordEmail,
} from '@sa-marketplace/common'
import { PasswordResetToken, UserStatus } from '@sa-marketplace/entities'
import * as bcrypt from 'bcryptjs'
import { IsNull, Repository } from 'typeorm'
import { AUTH_OPTIONS, PASSWORD_RESET_TOKEN_TTL_MINUTES } from './auth.constant'
import { AuthModuleOptions, AuthUser, JwtPayload } from './auth.typing'
import { UsersService } from './users.service'

const SALT_ROUNDS = 10

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    @Inject(AUTH_OPTIONS) private readonly options: AuthModuleOptions,
  ) {}

  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS)
  }

  // Called by LocalStrategy. Returns null when the email or password is wrong.
  async validateUser(
    email: string,
    password: string,
  ): Promise<AuthUser | null> {
    const user = await this.usersService.findByEmail(email)
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return null
    }

    if (user.status !== UserStatus.active) {
      throw new BusinessException(AppError.ECB403, 'This account is not active')
    }

    const roles = await this.usersService.getRoles(user.id)
    if (!roles.some((role) => this.options.allowedRoles.includes(role))) {
      throw new BusinessException(
        AppError.ECB403,
        'This account cannot sign in here',
      )
    }

    return {
      userId: user.id,
      email: user.email,
      roles,
      tokenVersion: user.tokenVersion,
    }
  }

  // The audience is added by JwtModule's signOptions in AuthCoreModule.
  async login(user: AuthUser) {
    const payload: JwtPayload = {
      sub: user.userId,
      email: user.email,
      roles: user.roles,
      tokenVersion: user.tokenVersion,
    }
    return { access_token: await this.jwtService.signAsync(payload) }
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId)
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      roles: await this.usersService.getRoles(user.id),
    }
  }

  // Every token issued before this call now fails JwtStrategy.
  logout(userId: string): Promise<void> {
    return this.usersService.incrementTokenVersion(userId)
  }

  // POST forgot-password: always resolves, whether or not the email exists (no user enumeration).
  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email)
    if (!user || user.status !== UserStatus.active) {
      return
    }

    // An old, unused link from an earlier request must not remain usable
    // once a new one is issued.
    await this.passwordResetTokenRepository.update(
      { userId: user.id, usedAt: IsNull() },
      { usedAt: new Date() },
    )

    // Opaque and random, not a JWT — a single-use secret needs no payload,
    // audience or signature, just enough entropy to be unguessable.
    const rawToken = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')

    const ttlMinutes = Number(
      this.configService.get<string>(
        'PASSWORD_RESET_TOKEN_TTL_MINUTES',
        String(PASSWORD_RESET_TOKEN_TTL_MINUTES),
      ),
    )
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000)

    await this.passwordResetTokenRepository.insert({
      userId: user.id,
      tokenHash,
      expiresAt,
    })

    // The only place the raw token exists outside this function — it is
    // never stored, only its hash is.
    const resetLink = this.buildResetLink(rawToken)
    this.mailService.send({
      to: user.email,
      subject: RESET_PASSWORD_SUBJECT,
      ...resetPasswordEmail({
        firstName: user.firstName,
        resetLink,
        ttlMinutes,
        supportEmail: this.configService.get<string>('SUPPORT_EMAIL'),
      }),
    })
  }

  // This app's own frontend page, with the token added to any query it already has. A bad setting
  // falls back to the default, not a throw: forgot-password answers the same for every email, and an
  // error only for real accounts would reveal which exist.
  private buildResetLink(rawToken: string): string {
    const { envKey, fallback } = this.options.resetPasswordUrl
    const configured = this.configService.get<string>(envKey)

    let link = this.parseWebUrl(configured || fallback)
    if (!link) {
      this.logger.error(`${envKey} is not an http(s) URL; using ${fallback}`)
      link = new URL(fallback)
    }
    link.searchParams.set('token', rawToken)
    return link.toString()
  }

  // "localhost:5173/x" parses as a URL with the scheme "localhost:", so the scheme is checked too.
  private parseWebUrl(value: string): URL | null {
    try {
      const url = new URL(value)
      return url.protocol === 'http:' || url.protocol === 'https:' ? url : null
    } catch {
      return null
    }
  }

  // POST reset-password: marked used on success, so a replay fails even within its TTL.
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex')

    const resetToken = await this.passwordResetTokenRepository.findOneBy({
      tokenHash,
      usedAt: IsNull(),
    })

    // One generic error either way — never tell a caller probing tokens
    // whether it was "not found" or "expired".
    if (!resetToken || resetToken.expiresAt < new Date()) {
      throw new BusinessException(
        AppError.ECB001,
        'This reset link is invalid or has expired',
      )
    }

    // Burn the token first: even if something below fails, it can never be
    // replayed. Worst case the user requests a new one.
    await this.passwordResetTokenRepository.update(resetToken.id, {
      usedAt: new Date(),
    })

    const passwordHash = await this.hashPassword(newPassword)
    await this.usersService.updatePasswordHash(
      resetToken.userId,
      passwordHash,
      newPassword.length,
    )

    // Evicts every existing session (ADR 0018), in case the account was compromised.
    await this.usersService.incrementTokenVersion(resetToken.userId)
  }

  // POST change-password: the JWT alone authorizes it, no current-password check (deliberate, ADR 0030).
  async changePassword(userId: string, newPassword: string) {
    const user = await this.usersService.findByIdOrFail(userId)

    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      throw new BusinessException(
        AppError.ECB001,
        'New password must be different from the current password',
      )
    }

    const passwordHash = await this.hashPassword(newPassword)
    await this.usersService.updatePasswordHash(
      userId,
      passwordHash,
      newPassword.length,
    )

    // Every existing session for this account, everywhere, stops working
    // immediately (same mechanism as logout/reset-password, ADR 0018).
    await this.usersService.incrementTokenVersion(userId)

    // Re-issue access_token so this session survives its own change (ADR 0030);
    // tokenVersion is reloaded, not assumed +1, in case of a concurrent bump.
    const refreshed = await this.usersService.findByIdOrFail(userId)
    const roles = await this.usersService.getRoles(userId)
    return await this.login({
      userId: refreshed.id,
      email: refreshed.email,
      roles,
      tokenVersion: refreshed.tokenVersion,
    })
  }
}
