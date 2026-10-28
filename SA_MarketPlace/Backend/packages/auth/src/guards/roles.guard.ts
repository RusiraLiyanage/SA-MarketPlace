import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { UserRoleType } from '@sa-marketplace/entities'
import { ROLES_KEY } from '../auth.constant'
import { AuthRequest } from '../auth.typing'

// Use after JwtAuthGuard, which is what sets req.user.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRoleType[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    )
    if (!requiredRoles?.length) {
      return true
    }

    const { user } = context.switchToHttp().getRequest<AuthRequest>()
    return requiredRoles.some((role) => user?.roles.includes(role))
  }
}
