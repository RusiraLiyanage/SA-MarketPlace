import { ConfigService } from '@nestjs/config'
import { UsersService } from '@sa-marketplace/auth'
import { SupplierProfile, SupplierStatus } from '@sa-marketplace/entities'
import { DataSource, Repository } from 'typeorm'
import { ApplicationService } from './application.service'

const profile = (overrides: Partial<SupplierProfile>): SupplierProfile =>
  ({
    id: 'profile-1',
    userId: 'user-1',
    businessName: 'Bindi MedSupply Pty Ltd',
    abn: '51824753556',
    status: SupplierStatus.rejected,
    rejectionReason: 'ABN could not be verified',
    submittedAt: new Date('2026-07-20T02:00:00Z'),
    reviewedAt: new Date('2026-07-24T05:00:00Z'),
    approvedAt: null,
    approvalAcknowledgedAt: null,
    ...overrides,
  } as SupplierProfile)

const serviceFor = (
  found: SupplierProfile | null,
  env: Record<string, string | undefined> = {},
) =>
  new ApplicationService(
    {
      findOneBy: jest.fn().mockResolvedValue(found),
    } as unknown as Repository<SupplierProfile>,
    {} as unknown as UsersService,
    { get: (key: string) => env[key] } as unknown as ConfigService,
    {} as unknown as DataSource,
  )

describe('ApplicationService.getMyApplication', () => {
  describe('the support contact on a rejected application', () => {
    it('uses the configured email and phone', async () => {
      const view = await serviceFor(profile({}), {
        SUPPORT_EMAIL: 'help@example.com',
        SUPPORT_PHONE: '1800 123 456',
      }).getMyApplication('user-1')

      expect(view).toMatchObject({
        supportContact: { email: 'help@example.com', phone: '1800 123 456' },
      })
    })

    it('falls back to the design email when none is configured', async () => {
      const view = await serviceFor(profile({})).getMyApplication('user-1')

      expect(view).toMatchObject({
        supportContact: { email: 'partners@sampleassist.com.au' },
      })
    })

    it.each([[undefined], [''], ['   ']])(
      'has no phone when SUPPORT_PHONE is %p, so the frontend hides the hotline',
      async (blank) => {
        const view = await serviceFor(profile({}), {
          SUPPORT_PHONE: blank,
        }).getMyApplication('user-1')

        expect(view).toMatchObject({ supportContact: { phone: null } })
      },
    )
  })

  describe('which fields each status exposes', () => {
    it('shows only the under-review fields while pending', async () => {
      const view = await serviceFor(
        profile({ status: SupplierStatus.pendingReview, reviewedAt: null }),
      ).getMyApplication('user-1')

      expect(Object.keys(view).sort()).toEqual([
        'abn',
        'businessName',
        'status',
        'submittedAt',
      ])
    })

    it('never exposes the rejection reason or ABN on an approved application', async () => {
      const view = await serviceFor(
        profile({
          status: SupplierStatus.approved,
          approvedAt: new Date('2026-07-27T03:00:00Z'),
          approvalAcknowledgedAt: new Date('2026-07-27T04:00:00Z'),
        }),
      ).getMyApplication('user-1')

      expect(view).toEqual({
        status: SupplierStatus.approved,
        businessName: 'Bindi MedSupply Pty Ltd',
        approvedAt: new Date('2026-07-27T03:00:00Z'),
        acknowledged: true,
      })
    })
  })

  it('throws ECB404 when the account has no supplier profile', async () => {
    await expect(serviceFor(null).getMyApplication('user-1')).rejects.toThrow(
      'No supplier application found for this account',
    )
  })
})
