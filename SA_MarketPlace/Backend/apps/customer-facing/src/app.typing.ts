import { UserRoleType } from '@sa-marketplace/entities'
import { Request } from 'express'

/** Per-request context. Auth will populate userId and roles; nothing sets them yet. */
export interface RequestMeta {
  ipAddress: string
  userAgent: string
  userId?: string
  roles?: UserRoleType[]
}

/** An Express request that may carry RequestMeta once auth attaches it. */
export type AppRequest = Request & { meta?: RequestMeta }
