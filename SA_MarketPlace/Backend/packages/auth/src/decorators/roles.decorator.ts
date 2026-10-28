import { SetMetadata } from '@nestjs/common'
import { UserRoleType } from '@sa-marketplace/entities'
import { ROLES_KEY } from '../auth.constant'

export const Roles = (...roles: UserRoleType[]) => SetMetadata(ROLES_KEY, roles)
