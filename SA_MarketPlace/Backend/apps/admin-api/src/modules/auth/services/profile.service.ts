import { Injectable } from '@nestjs/common'
import { UsersService } from '@sa-marketplace/auth'
import { joinContactName, splitContactName } from '@sa-marketplace/common'
import { MyAdminProfile } from '../auth.typing'
import { UpdateProfileDto } from '../dto/update-profile.dto'

// The signed-in admin's own profile. userId comes from the token, never a URL or body (§7).
@Injectable()
export class ProfileService {
  constructor(private readonly usersService: UsersService) {}

  // GET /auth/profile: the My Profile screen.
  async getMyProfile(userId: string): Promise<MyAdminProfile> {
    // Step 1: load the user and their roles.
    const [user, roles] = await Promise.all([
      this.usersService.findByIdOrFail(userId),
      this.usersService.getRoles(userId),
    ])

    // Step 2: map to MyAdminProfile: fullName is the first and last name joined; memberSince is createdAt; passwordLength is the stored length; lastSignInAt is the recorded last sign-in, or null.
    return {
      fullName: joinContactName(user.firstName, user.lastName),
      email: user.email,
      roles,
      passwordLength: user.passwordLength,
      memberSince: user.createdAt,
      lastSignInAt: user.lastSignInAt,
    }
  }

  // PATCH /auth/profile: Save changes.
  async updateMyProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<MyAdminProfile> {
    // Step 1: update the name only if dto.fullName was sent, split into firstName and lastName; an empty body writes nothing.
    if (dto.fullName !== undefined) {
      await this.usersService.updateProfile(
        userId,
        splitContactName(dto.fullName),
      )
    }

    // Step 2: return the refreshed profile via getMyProfile.
    return await this.getMyProfile(userId)
  }
}
