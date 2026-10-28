import { Injectable } from '@nestjs/common'
import { AuthService, UsersService } from '@sa-marketplace/auth'
import { AppError, BusinessException } from '@sa-marketplace/common'
import { Organisation, UserRoleType } from '@sa-marketplace/entities'
import { DataSource, EntityManager } from 'typeorm'
import { RegisterDto } from '../dto/register.dto'

// Customer sign-up creates a buyer. Supplier and admin apps register differently.
@Injectable()
export class RegistrationService {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  async register(dto: RegisterDto) {
    if (await this.usersService.findByEmail(dto.email)) {
      throw new BusinessException(
        AppError.ECB409,
        'An account with this email already exists',
      )
    }

    const passwordHash = await this.authService.hashPassword(dto.password)

    // Organisation, user and role are saved together, or not at all.
    const user = await this.dataSource.transaction(async (manager) => {
      const organisation = await this.findOrCreateOrganisation(
        manager,
        dto.organisation,
      )
      return await this.usersService.createUser(
        manager,
        {
          email: dto.email,
          passwordHash,
          passwordLength: dto.password.length,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          organisationId: organisation.id,
          // Server clock, not the client's: this is the record of consent.
          termsAcceptedAt: new Date(),
        },
        UserRoleType.buyer,
      )
    })

    return await this.authService.login({
      userId: user.id,
      email: user.email,
      roles: [UserRoleType.buyer],
      tokenVersion: user.tokenVersion,
    })
  }

  // Case-insensitive name match. Free text for Phase 1 (CLAUDE.md §9.4).
  private async findOrCreateOrganisation(
    manager: EntityManager,
    rawName: string,
  ): Promise<Organisation> {
    const name = rawName.trim().replace(/\s+/g, ' ')

    const existing = await manager
      .createQueryBuilder(Organisation, 'organisation')
      .where('LOWER(organisation.name) = LOWER(:name)', { name })
      .getOne()
    if (existing) {
      return existing
    }

    return await manager.save(manager.create(Organisation, { name }))
  }
}
