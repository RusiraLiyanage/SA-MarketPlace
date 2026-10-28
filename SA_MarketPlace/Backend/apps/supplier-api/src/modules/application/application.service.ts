import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { UsersService } from '@sa-marketplace/auth'
import {
  BusinessException,
  joinContactName,
  splitContactName,
} from '@sa-marketplace/common'
import { SupplierProfile, SupplierStatus, User } from '@sa-marketplace/entities'
import { DataSource, IsNull, Repository } from 'typeorm'
import { ApplicationError } from './application.exception'
import {
  ApplicationDetails,
  ApplicationView,
  SupportContact,
} from './application.typing'
import { ResubmitApplicationDto } from './dto/resubmit-application.dto'

const DEFAULT_SUPPORT_EMAIL = 'partners@sampleassist.com.au'

// The seller's own application; userId always comes from the verified JWT (§7), never URL or body.
@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(SupplierProfile)
    private readonly supplierProfileRepository: Repository<SupplierProfile>,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  // GET /application: the application's status (pending, rejected or approved).
  async getMyApplication(userId: string): Promise<ApplicationView> {
    // Step 1: load the SupplierProfile by userId (unique, so at most one);
    //   none → ECB404 ApplicationError.PROFILE_NOT_FOUND.
    const profile = await this.findProfile(userId)

    // Step 2: return the view for profile.status: pending, rejected (with support contact) or approved.
    return this.toView(profile)
  }

  // POST /application/acknowledge — "Proceed to dashboard". Persisted so the
  // approval notice never shows a second time, on any device.
  async acknowledgeApproval(userId: string): Promise<void> {
    // Step 1: load the profile (same ECB404 as above).
    const profile = await this.findProfile(userId)

    // Step 2: status !== approved → ECB409 ApplicationError.NOT_APPROVED.
    if (profile.status !== SupplierStatus.approved) {
      throw new BusinessException(
        ApplicationError.NOT_APPROVED.code,
        ApplicationError.NOT_APPROVED.message,
      )
    }

    // Step 3: idempotent: if already acknowledged, leave the original time alone.
    if (profile.approvalAcknowledgedAt) {
      return
    }

    // Step 4: otherwise set approvalAcknowledgedAt = now. The IsNull
    //   condition keeps the first time even when two calls race.
    await this.supplierProfileRepository.update(
      { id: profile.id, approvalAcknowledgedAt: IsNull() },
      { approvalAcknowledgedAt: new Date() },
    )
  }

  // GET /application/details — pre-fills the "Update and resubmit" form.
  async getResubmissionDetails(userId: string): Promise<ApplicationDetails> {
    // Step 1: load the profile (ECB404) and the User (usersService.findByIdOrFail).
    const profile = await this.findProfile(userId)
    const user = await this.usersService.findByIdOrFail(userId)

    // Step 2: status !== rejected → ECB409 ApplicationError.NOT_REJECTED.
    this.assertRejected(profile)

    // Step 3: return { businessName, abn, businessType, contactName:
    //   joinContactName(firstName, lastName), phone, email }.
    return {
      businessName: profile.businessName,
      abn: profile.abn,
      businessType: profile.businessType,
      contactName: joinContactName(user.firstName, user.lastName),
      phone: user.phone,
      email: user.email,
    }
  }

  // PUT /application — "Update and resubmit". Sends the application back to
  // the admin queue; it is never approved by doing this.
  async resubmit(
    userId: string,
    dto: ResubmitApplicationDto,
  ): Promise<ApplicationView> {
    // Step 1: load the profile (ECB404); status !== rejected → ECB409
    //   ApplicationError.NOT_REJECTED.
    const profile = await this.findProfile(userId)
    this.assertRejected(profile)

    const { firstName, lastName } = splitContactName(dto.contactName)

    // Step 2: in one transaction, put the profile back to pending (clearing the old decision)
    //   and update the user's name and phone.
    await this.dataSource.transaction(async (manager) => {
      // The status in the condition makes this the real guard: two quick
      // resubmits, or one racing an admin decision, can't both win.
      const result = await manager.update(
        SupplierProfile,
        { id: profile.id, status: SupplierStatus.rejected },
        {
          businessName: dto.businessName.trim(),
          abn: dto.abn,
          businessType: dto.businessType?.trim() || null,
          status: SupplierStatus.pendingReview,
          submittedAt: new Date(),
          // The previous decision no longer applies.
          rejectionReason: null,
          reviewedAt: null,
          approvedByUserId: null,
        },
      )
      if (result.affected !== 1) {
        throw new BusinessException(
          ApplicationError.NOT_REJECTED.code,
          ApplicationError.NOT_REJECTED.message,
        )
      }

      await manager.update(
        User,
        { id: userId },
        { firstName, lastName, phone: dto.phone },
      )
    })

    // Step 3: return the refreshed view — getMyApplication(userId), which is
    //   now the pending variant, so the frontend lands on "under review".
    return await this.getMyApplication(userId)
  }

  private async findProfile(userId: string): Promise<SupplierProfile> {
    const profile = await this.supplierProfileRepository.findOneBy({ userId })

    if (!profile) {
      throw new BusinessException(
        ApplicationError.PROFILE_NOT_FOUND.code,
        ApplicationError.PROFILE_NOT_FOUND.message,
      )
    }

    return profile
  }

  private assertRejected(profile: SupplierProfile): void {
    if (profile.status !== SupplierStatus.rejected) {
      throw new BusinessException(
        ApplicationError.NOT_REJECTED.code,
        ApplicationError.NOT_REJECTED.message,
      )
    }
  }

  // ABN is returned raw; the "51 824 753 556" spacing is the frontend's job.
  private toView(profile: SupplierProfile): ApplicationView {
    switch (profile.status) {
      case SupplierStatus.pendingReview:
        return {
          status: profile.status,
          businessName: profile.businessName,
          abn: profile.abn,
          submittedAt: profile.submittedAt,
        }
      case SupplierStatus.rejected:
        return {
          status: profile.status,
          businessName: profile.businessName,
          rejectionReason: profile.rejectionReason,
          reviewedAt: profile.reviewedAt,
          supportContact: this.supportContact(),
        }
      case SupplierStatus.approved:
        return {
          status: profile.status,
          businessName: profile.businessName,
          approvedAt: profile.approvedAt,
          acknowledged: profile.approvalAcknowledgedAt !== null,
        }
    }
  }

  // SUPPORT_PHONE has no default: blank means no hotline line is shown.
  private supportContact(): SupportContact {
    return {
      email:
        this.configService.get<string>('SUPPORT_EMAIL')?.trim() ||
        DEFAULT_SUPPORT_EMAIL,
      phone: this.configService.get<string>('SUPPORT_PHONE')?.trim() || null,
    }
  }
}
