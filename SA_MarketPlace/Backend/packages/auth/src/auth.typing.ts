import { UserRoleType } from '@sa-marketplace/entities'
import { Request } from 'express'
import { AuthAudience } from './auth.constant'

/** Passed by each app to AuthCoreModule.register(). */
export interface AuthModuleOptions {
  audience: AuthAudience
  /** Login is refused unless the user holds at least one of these roles. */
  allowedRoles: UserRoleType[]
  /** Where this app's reset email sends the user: its own frontend's page, set by an env var. */
  resetPasswordUrl: {
    /** The env var holding the URL, e.g. ADMIN_RESET_URL. */
    envKey: string
    /** Used when the env var is unset or not a valid URL. */
    fallback: string
  }
}

/** What the strategies attach to req.user. */
export interface AuthUser {
  userId: string
  email: string
  roles: UserRoleType[]
  tokenVersion: number
}

/** What goes inside the JWT. */
export interface JwtPayload {
  sub: string
  email: string
  roles: UserRoleType[]
  tokenVersion: number
}

export type AuthRequest = Request & { user: AuthUser }
