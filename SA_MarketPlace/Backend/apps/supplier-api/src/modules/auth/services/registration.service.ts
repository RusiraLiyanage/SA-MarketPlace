import { Injectable } from '@nestjs/common'
import { AuthService, UsersService } from '@sa-marketplace/auth'
import {
  AppError,
  BusinessException,
  splitContactName,
} from '@sa-marketplace/common'
import { SupplierProfile, UserRoleType } from '@sa-marketplace/entities'
import { DataSource } from 'typeorm'
import { RegisterDto } from '../dto/register.dto'

// Seller sign-up creates a seller. Buyer and admin apps register differently.
@Injectable()
export class RegistrationService {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  // Same shape as customer registration, with a SupplierProfile created
  // where customer registration finds-or-creates an Organisation.
  async register(dto: RegisterDto) {
    // Step 1: reject if dto.email is already registered — same ECB409 as
    //   customer registration (usersService.findByEmail).
    if (await this.usersService.findByEmail(dto.email)) {
      throw new BusinessException(
        AppError.ECB409,
        'An account with this email already exists',
      )
    }

    // Step 2: split dto.contactName on the last space into firstName and lastName.
    const { firstName, lastName } = splitContactName(dto.contactName)

    // Step 3: hash dto.password (authService.hashPassword).
    const passwordHash = await this.authService.hashPassword(dto.password)

    // Step 4: in one transaction, create the User + seller role, then a pending SupplierProfile.
    const user = await this.dataSource.transaction(async (manager) => {
      const created = await this.usersService.createUser(
        manager,
        {
          email: dto.email,
          passwordHash,
          passwordLength: dto.password.length,
          firstName,
          lastName,
          phone: dto.phone,
        },
        UserRoleType.seller,
      )
      await manager.save(
        manager.create(SupplierProfile, {
          userId: created.id,
          businessName: dto.businessName.trim(),
          abn: dto.abn,
          businessType: dto.businessType?.trim() || null,
          submittedAt: new Date(),
        }),
      )
      return created
    })

    // Step 5: return a fresh access_token, as customer registration does.
    return await this.authService.login({
      userId: user.id,
      email: user.email,
      roles: [UserRoleType.seller],
      tokenVersion: user.tokenVersion,
    })
  }
}
