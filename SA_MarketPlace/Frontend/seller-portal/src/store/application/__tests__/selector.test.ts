import { describe, expect, it } from 'vitest'
import { hasPortalAccess } from 'src/store/application/selector'
import { ApplicationStatus, type Application } from 'src/store/application/types'

const pending: Application = { status: ApplicationStatus.pendingReview, businessName: 'B', abn: '51824753556', submittedAt: '2026-07-25T00:00:00.000Z' }
const rejected: Application = {
  status: ApplicationStatus.rejected,
  businessName: 'B',
  rejectionReason: 'No',
  reviewedAt: null,
  supportContact: { email: 'a@b.c', phone: null },
}
const approved = (acknowledged: boolean): Application => ({
  status: ApplicationStatus.approved,
  businessName: 'B',
  approvedAt: null,
  acknowledged,
})

describe('hasPortalAccess', () => {
  it('lets an approved seller who has seen the notice into the portal', () => {
    expect(hasPortalAccess(approved(true))).toBe(true)
  })

  it('keeps a newly approved seller on the notice until they proceed', () => {
    expect(hasPortalAccess(approved(false))).toBe(false)
  })

  it('keeps pending and rejected sellers out', () => {
    expect(hasPortalAccess(pending)).toBe(false)
    expect(hasPortalAccess(rejected)).toBe(false)
  })
})
