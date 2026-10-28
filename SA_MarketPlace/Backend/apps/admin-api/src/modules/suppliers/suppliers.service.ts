import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import {
  BusinessException,
  getSupplierProductCategories,
  joinContactName,
  MailService,
  PagingMetaDto,
  TPagingResDto,
} from '@sa-marketplace/common'
import { SupplierProfile, SupplierStatus } from '@sa-marketplace/entities'
import { Repository } from 'typeorm'
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity'
import { REJECTION_REASON_LABELS, RejectionReason } from './suppliers.constant'
import { SupplierError } from './suppliers.exception'
import {
  ListSuppliersQueryDto,
  RejectSupplierDto,
  SUPPLIER_QUEUE_ORDER,
  SUPPLIER_SORT_COLUMNS,
} from './suppliers.dto'
import {
  SupplierApplicationCounts,
  SupplierApplicationDetail,
  SupplierApplicationListItem,
} from './suppliers.typing'

// Every supplier application, for Sample Assist staff. Admin routes are not scoped to one supplier:
// the role guard on the controller is the boundary (§7).
@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(SupplierProfile)
    private readonly supplierRepository: Repository<SupplierProfile>,
    private readonly mailService: MailService,
  ) {}

  // GET /suppliers: the verification table, filtered, searched and paged.
  async listSuppliers(
    query: ListSuppliersQueryDto,
  ): Promise<TPagingResDto<SupplierApplicationListItem>> {
    // Step 1: every supplier profile, with the contact user inner-joined.
    const queryBuilder = this.supplierRepository
      .createQueryBuilder('supplier')
      .innerJoinAndSelect('supplier.user', 'user')

    // Step 2: if query.status is set, keep applications with that status.
    if (query.status) {
      queryBuilder.andWhere('supplier.status = :status', {
        status: query.status,
      })
    }

    // Step 3: if query.search is set, match the business name, or the ABN once spaces are removed, case-insensitively, escaping LIKE wildcards.
    const term = query.search?.trim()
    if (term) {
      const search = `%${term.replace(/[\\%_]/g, '\\$&')}%`
      // Digits are only an ABN when that is all the term is, so "Bindi 2" does not match ABNs.
      if (/^[\d\s]+$/.test(term)) {
        queryBuilder.andWhere(
          '(supplier.businessName ILIKE :search OR supplier.abn LIKE :abn)',
          { search, abn: `%${term.replace(/\s/g, '')}%` },
        )
      } else {
        queryBuilder.andWhere('supplier.businessName ILIKE :search', { search })
      }
    }

    // Step 4: sort by the allow-listed column, or the queue order when orderField is `queue`; supplier.id as tie-break; page with getManyAndCount().
    const total = await queryBuilder.getCount()

    if (query.orderField === SUPPLIER_QUEUE_ORDER) {
      queryBuilder
        .orderBy(`("supplier"."status" = 'pending_review')`, 'DESC')
        .addOrderBy(
          `CASE WHEN "supplier"."status" = 'pending_review' THEN "supplier"."submitted_at" END`,
          'ASC',
        )
        .addOrderBy('"supplier"."reviewed_at"', 'DESC', 'NULLS LAST')
    } else {
      queryBuilder.orderBy(
        SUPPLIER_SORT_COLUMNS[
          query.orderField as keyof typeof SUPPLIER_SORT_COLUMNS
        ],
        query.order,
      )
    }

    const suppliers = await queryBuilder
      .addOrderBy('supplier.id', 'ASC')
      .offset(query.skip)
      .limit(query.take)
      .getMany()

    // Step 5: map each row: contactName is the user's first and last name joined, contactEmail the user's email.
    const data = suppliers.map(
      (supplier): SupplierApplicationListItem => ({
        id: supplier.id,
        businessName: supplier.businessName,
        abn: supplier.abn,
        contactName: joinContactName(
          supplier.user.firstName,
          supplier.user.lastName,
        ),
        contactEmail: supplier.user.email,
        submittedAt: supplier.submittedAt,
        status: supplier.status,
        reviewedAt: supplier.reviewedAt,
        rejectionReason: supplier.rejectionReason,
      }),
    )

    // Step 6: return { data, pagingMeta: new PagingMetaDto(query, total) }.
    return { data, pagingMeta: new PagingMetaDto(query, total) }
  }

  // GET /suppliers/summary: the tab counts, the "awaiting review" banner and the sidebar badge.
  async getSummary(): Promise<SupplierApplicationCounts> {
    // Step 1: one grouped query counting supplier profiles by status.
    const rows = await this.supplierRepository
      .createQueryBuilder('supplier')
      .select('supplier.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('supplier.status')
      .getRawMany<{ status: SupplierStatus; count: string }>()

    // Step 2: map to { all, pendingReview, approved, rejected }, a missing status counting as 0.
    const countOf = (status: SupplierStatus): number =>
      Number(rows.find((row) => row.status === status)?.count ?? 0)

    return {
      all: rows.reduce((sum, row) => sum + Number(row.count), 0),
      pendingReview: countOf(SupplierStatus.pendingReview),
      approved: countOf(SupplierStatus.approved),
      rejected: countOf(SupplierStatus.rejected),
    }
  }

  // GET /suppliers/:supplierId: the application screen, for Review (pending) and View (decided).
  async getApplication(supplierId: string): Promise<SupplierApplicationDetail> {
    // Step 1: load the profile with its contact user and approving admin;
    //   none → ECB404 SupplierError.NOT_FOUND.
    const supplier = await this.findOrFail(supplierId)

    // Step 2: productCategories comes from getSupplierProductCategories (shared with the seller's profile).
    const productCategories = await getSupplierProductCategories(
      this.supplierRepository.manager,
      supplier.id,
    )

    // Step 3: return the detail view: business details, contact, categories, status, dates, reason.
    return {
      id: supplier.id,
      businessName: supplier.businessName,
      abn: supplier.abn,
      businessType: supplier.businessType,
      contactName: joinContactName(
        supplier.user.firstName,
        supplier.user.lastName,
      ),
      contactEmail: supplier.user.email,
      contactPhone: supplier.user.phone,
      productCategories,
      status: supplier.status,
      submittedAt: supplier.submittedAt,
      reviewedAt: supplier.reviewedAt,
      rejectionReason: supplier.rejectionReason,
      reviewedByName: supplier.approvedByUser
        ? joinContactName(
            supplier.approvedByUser.firstName,
            supplier.approvedByUser.lastName,
          )
        : null,
    }
  }

  // POST /suppliers/:supplierId/approve: the switch that makes the seller's listings visible.
  async approve(
    adminUserId: string,
    supplierId: string,
  ): Promise<SupplierApplicationDetail> {
    // Step 1: load the profile; none → ECB404 SupplierError.NOT_FOUND.
    const supplier = await this.findOrFail(supplierId)

    // Step 2: conditional UPDATE … WHERE id AND status = pending_review setting status approved,
    //   approvedAt and reviewedAt = now, approvedByUserId = adminUserId, rejectionReason null;
    //   affected !== 1 (already decided, or another admin got there first) → ECB409 NOT_PENDING.
    const now = new Date()
    await this.decide(supplier.id, {
      status: SupplierStatus.approved,
      approvedAt: now,
      reviewedAt: now,
      approvedByUserId: adminUserId,
      rejectionReason: null,
    })

    // Step 3: email the contact that they can sign in now (mock MailService).
    this.mailService.send({
      to: supplier.user.email,
      subject: `${supplier.businessName} is approved on Sample Assist Marketplace`,
      text: `Hi ${supplier.user.firstName},\n\nYour supplier application for ${supplier.businessName} has been approved. You can sign in to the seller portal now and start listing products.`,
    })

    // Step 4: return the updated detail view (productCategories as in getApplication).
    return await this.getApplication(supplier.id)
  }

  // POST /suppliers/:supplierId/reject: the applicant sees the stored reason and may resubmit.
  async reject(
    adminUserId: string,
    supplierId: string,
    dto: RejectSupplierDto,
  ): Promise<SupplierApplicationDetail> {
    // Step 1: reason is "other" and detail is empty → ECB001 SupplierError.DETAIL_REQUIRED.
    if (dto.reason === RejectionReason.other && !dto.detail) {
      throw new BusinessException(
        SupplierError.DETAIL_REQUIRED.code,
        SupplierError.DETAIL_REQUIRED.message,
      )
    }

    // Step 2: load the profile; none → ECB404 NOT_FOUND.
    const supplier = await this.findOrFail(supplierId)

    // Step 3: build the stored reason: the reason's label, then ". " and the detail if given.
    const reason = dto.detail
      ? `${REJECTION_REASON_LABELS[dto.reason]}. ${dto.detail}`
      : REJECTION_REASON_LABELS[dto.reason]

    // Step 4: conditional UPDATE … WHERE id AND status = pending_review setting status rejected,
    //   reviewedAt = now, approvedByUserId = adminUserId, rejectionReason; affected !== 1 → ECB409 NOT_PENDING.
    await this.decide(supplier.id, {
      status: SupplierStatus.rejected,
      reviewedAt: new Date(),
      approvedByUserId: adminUserId,
      rejectionReason: reason,
    })

    // Step 5: email the contact the reason and that they can update and resubmit (mock MailService).
    this.mailService.send({
      to: supplier.user.email,
      subject: `Your ${supplier.businessName} application needs changes`,
      text: `Hi ${supplier.user.firstName},\n\nYour supplier application for ${supplier.businessName} was not approved.\n\nReason: ${reason}\n\nYou can sign in, update your details and resubmit at any time.`,
    })

    // Step 6: return the updated detail view (productCategories as in getApplication).
    return await this.getApplication(supplier.id)
  }

  private async findOrFail(supplierId: string): Promise<SupplierProfile> {
    const supplier = await this.supplierRepository.findOne({
      where: { id: supplierId },
      relations: { user: true, approvedByUser: true },
    })
    if (!supplier) {
      throw new BusinessException(
        SupplierError.NOT_FOUND.code,
        SupplierError.NOT_FOUND.message,
      )
    }
    return supplier
  }

  // The status condition is the race guard: of two admins deciding at once, one update matches.
  private async decide(
    supplierId: string,
    changes: QueryDeepPartialEntity<SupplierProfile>,
  ): Promise<void> {
    const result = await this.supplierRepository.update(
      { id: supplierId, status: SupplierStatus.pendingReview },
      changes,
    )
    if (result.affected !== 1) {
      throw new BusinessException(
        SupplierError.NOT_PENDING.code,
        SupplierError.NOT_PENDING.message,
      )
    }
  }
}
