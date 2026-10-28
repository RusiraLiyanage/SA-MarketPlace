import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AuthService, UsersService } from '@sa-marketplace/auth'
import {
  AppError,
  BusinessException,
  splitContactName,
} from '@sa-marketplace/common'
import { UserRoleType } from '@sa-marketplace/entities'
import { DataSource, QueryFailedError } from 'typeorm'
import {
  DEFAULT_ADMIN_EMAIL_DOMAINS,
  isAllowedAdminEmail,
  parseEmailDomains,
} from '../admin-email-domain'
import { AuthError } from '../auth.exception'
import { RegisterDto } from '../dto/register.dto'

const USER_EMAIL_CONSTRAINT = 'uq_user_email'

// Admin sign-up is open only to Sample Assist staff email addresses.
@Injectable()
export class RegistrationService {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  // Same shape as the seller sign-up, with an allowed-domain check where the seller
  // sign-up creates a SupplierProfile.
  async register(dto: RegisterDto) {
    // Step 1: dto.email must end in an allowed domain (ADMIN_EMAIL_DOMAINS, default sampleassist.com.au), else ECB001 EMAIL_DOMAIN_NOT_ALLOWED.
    const allowedDomains = parseEmailDomains(
      this.configService.get<string>(
        'ADMIN_EMAIL_DOMAINS',
        DEFAULT_ADMIN_EMAIL_DOMAINS,
      ),
    )
    if (!isAllowedAdminEmail(dto.email, allowedDomains)) {
      throw new BusinessException(
        AuthError.EMAIL_DOMAIN_NOT_ALLOWED.code,
        AuthError.EMAIL_DOMAIN_NOT_ALLOWED.message,
      )
    }

    // Step 2: reject if dto.email is already registered, ECB409 as the other sign-ups do.
    if (await this.usersService.findByEmail(dto.email)) {
      throw this.emailTaken()
    }

    // Step 3: split dto.fullName on the last space into firstName and lastName, and hash dto.password.
    const { firstName, lastName } = splitContactName(dto.fullName)
    const passwordHash = await this.authService.hashPassword(dto.password)

    // Step 4: in one transaction, create the User with termsAcceptedAt and the admin role; a simultaneous sign-up for the same email loses on the unique constraint and gets the same ECB409.
    let user
    try {
      user = await this.dataSource.transaction((manager) =>
        this.usersService.createUser(
          manager,
          {
            email: dto.email,
            passwordHash,
            passwordLength: dto.password.length,
            firstName,
            lastName,
            termsAcceptedAt: new Date(),
          },
          UserRoleType.admin,
        ),
      )
    } catch (error) {
      if (isEmailViolation(error)) {
        throw this.emailTaken()
      }
      throw error
    }

    // Step 5: record this as their first sign-in, and return a fresh access_token, as the other sign-ups do.
    await this.usersService.recordSignIn(user.id)
    return await this.authService.login({
      userId: user.id,
      email: user.email,
      roles: [UserRoleType.admin],
      tokenVersion: user.tokenVersion,
    })
  }

  private emailTaken(): BusinessException {
    return new BusinessException(
      AppError.ECB409,
      'An account with this email already exists',
    )
  }
}

// Postgres 23505 on the user email constraint, and nothing else.
const isEmailViolation = (error: unknown): boolean => {
  if (!(error instanceof QueryFailedError)) return false
  const { code, constraint } = error.driverError as {
    code?: string
    constraint?: string
  }
  return code === '23505' && constraint === USER_EMAIL_CONSTRAINT
}
