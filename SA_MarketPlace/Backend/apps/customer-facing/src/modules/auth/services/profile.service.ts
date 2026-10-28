import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { UsersService } from '@sa-marketplace/auth'
import { Order, Organisation, UserRoleType } from '@sa-marketplace/entities'
import { Repository } from 'typeorm'
import { UpdateProfileDto } from '../dto/update-profile.dto'

// passwordLength only, never the password or hash (see auth.controller.ts).
export interface MyProfile {
  email: string
  firstName: string
  lastName: string
  phone: string | null
  organisationName: string | null
  roles: UserRoleType[]
  memberSince: Date
  ordersPlaced: number
  passwordLength: number
}

@Injectable()
export class ProfileService {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(Organisation)
    private readonly organisationRepository: Repository<Organisation>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  // GET /auth/profile — userId comes from the verified JWT (§7), never a param.
  async getMyProfile(userId: string): Promise<MyProfile> {
    const user = await this.usersService.findByIdOrFail(userId)

    const [roles, organisation, ordersPlaced] = await Promise.all([
      this.usersService.getRoles(userId),
      user.organisationId
        ? this.organisationRepository.findOneBy({ id: user.organisationId })
        : null,
      // Every order this buyer has ever placed, cancelled or not — "placed"
      // describes the historical event, not the order's current status.
      this.orderRepository.count({ where: { userId } }),
    ])

    return {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      organisationName: organisation?.name ?? null,
      roles,
      memberSince: user.createdAt,
      ordersPlaced,
      passwordLength: user.passwordLength,
    }
  }

  // PATCH /auth/profile: firstName/lastName/phone only; never email, password or organisation (ADR 0028).
  async updateMyProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<MyProfile> {
    await this.usersService.updateProfile(userId, dto)
    return await this.getMyProfile(userId)
  }
}
