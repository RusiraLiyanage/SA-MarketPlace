import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { UsersService } from '@sa-marketplace/auth'
import {
  getSupplierProductCategories,
  joinContactName,
  splitContactName,
} from '@sa-marketplace/common'
import { SupplierProfile, User } from '@sa-marketplace/entities'
import { DataSource, Repository } from 'typeorm'
import { SupplierContext } from '../../../guards/approved-supplier.guard'
import { MyBusinessProfile } from '../auth.typing'
import { UpdateProfileDto } from '../dto/update-profile.dto'

// The signed-in seller's own business profile. userId and supplier come from the token (§7).
@Injectable()
export class ProfileService {
  constructor(
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
    @InjectRepository(SupplierProfile)
    private readonly profileRepository: Repository<SupplierProfile>,
  ) {}

  // GET /auth/profile: the Business Profile screen.
  async getMyProfile(
    userId: string,
    supplier: SupplierContext,
  ): Promise<MyBusinessProfile> {
    // Step 1: load the user and this seller's profile (by supplier.profileId).
    const [user, profile] = await Promise.all([
      this.usersService.findByIdOrFail(userId),
      this.profileRepository.findOneByOrFail({ id: supplier.profileId }),
    ])

    // Step 2: productCategories come from the seller's products (getSupplierProductCategories).
    const productCategories = await getSupplierProductCategories(
      this.dataSource.manager,
      supplier.profileId,
    )

    // Step 3: map to MyBusinessProfile: contactName is the user's first and last name joined; approvedAt is the profile's.
    return {
      business: {
        businessName: profile.businessName,
        abn: profile.abn,
        businessType: profile.businessType,
      },
      contact: {
        contactName: joinContactName(user.firstName, user.lastName),
        phone: user.phone,
      },
      productCategories,
      email: user.email,
      passwordLength: user.passwordLength,
      fulfilment: {
        dispatchSlaHours: profile.dispatchSlaHours,
        defaultCarrier: profile.defaultCarrier,
      },
      verification: {
        status: profile.status,
        approvedAt: profile.approvedAt,
      },
    }
  }

  // PATCH /auth/profile: Save changes.
  async updateMyProfile(
    userId: string,
    supplier: SupplierContext,
    dto: UpdateProfileDto,
  ): Promise<MyBusinessProfile> {
    // Step 1: if dto.contactName is set, split it into firstName and lastName (splitContactName).
    const name =
      dto.contactName === undefined
        ? undefined
        : splitContactName(dto.contactName)

    // Step 2: in one transaction, update the user's name and phone and the profile's businessType, dispatchSlaHours and defaultCarrier, only for fields sent (null clears).
    // Unsent fields are undefined, which the update skips; an update with nothing to set is not run.
    const userChanges = {
      firstName: name?.firstName,
      lastName: name?.lastName,
      phone: dto.phone,
    }
    const profileChanges = {
      businessType: dto.businessType,
      dispatchSlaHours: dto.dispatchSlaHours,
      defaultCarrier: dto.defaultCarrier,
    }
    await this.dataSource.transaction(async (manager) => {
      if (hasValues(userChanges)) {
        await manager.update(User, { id: userId }, userChanges)
      }
      if (hasValues(profileChanges)) {
        await manager.update(
          SupplierProfile,
          { id: supplier.profileId },
          profileChanges,
        )
      }
    })

    // Step 3: return the refreshed profile via getMyProfile.
    return await this.getMyProfile(userId, supplier)
  }
}

const hasValues = (changes: Record<string, unknown>): boolean =>
  Object.values(changes).some((value) => value !== undefined)
