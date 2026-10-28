import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { AuthRequest } from '@sa-marketplace/auth'
import { AppError, BusinessException } from '@sa-marketplace/common'
import { SupplierProfile, SupplierStatus } from '@sa-marketplace/entities'
import { Repository } from 'typeorm'

/** Who the signed-in seller is, resolved once per request by ApprovedSupplierGuard. */
export interface SupplierContext {
  profileId: string
  businessName: string
  dispatchSlaHours: number
  /** IANA name; where this seller's "today" starts and ends. */
  timezone: string
  /** Prefills the carrier field when dispatching; null if none is set. */
  defaultCarrier: string | null
}

export type SupplierRequest = AuthRequest & { supplier: SupplierContext }

// Keeps unapproved sellers out of all but their own application endpoints (CLAUDE.md §5, ADR 0032).
// Resolves profileId from the token so modules never scope by caller input (§7).
@Injectable()
export class ApprovedSupplierGuard implements CanActivate {
  constructor(
    @InjectRepository(SupplierProfile)
    private readonly supplierProfileRepository: Repository<SupplierProfile>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SupplierRequest>()

    const profile = await this.supplierProfileRepository.findOneBy({
      userId: request.user.userId,
    })

    if (!profile || profile.status !== SupplierStatus.approved) {
      throw new BusinessException(
        AppError.ECB403,
        'Your supplier application has not been approved yet',
      )
    }

    request.supplier = {
      profileId: profile.id,
      businessName: profile.businessName,
      dispatchSlaHours: profile.dispatchSlaHours,
      timezone: profile.timezone,
      defaultCarrier: profile.defaultCarrier,
    }
    return true
  }
}
