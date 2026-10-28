import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ApplicationPage from 'src/pages/Application'
import { useGetApplicationQuery } from 'src/store/application/actions'
import { ApplicationStatus, type Application } from 'src/store/application/types'
import { renderWithRouter } from 'src/test/renderWithRouter'

vi.mock('src/store/application/actions', () => ({
  useGetApplicationQuery: vi.fn(),
  useAcknowledgeApplicationMutation: () => [vi.fn(), { isLoading: false }],
}))

const show = (application: Application) => {
  vi.mocked(useGetApplicationQuery).mockReturnValue({ data: application, refetch: vi.fn() } as unknown as ReturnType<typeof useGetApplicationQuery>)
  return renderWithRouter(<ApplicationPage />, '/application', [{ path: '/', element: <p>the dashboard</p> }])
}

describe('ApplicationPage', () => {
  beforeEach(() => vi.mocked(useGetApplicationQuery).mockReset())

  it('shows the under-review screen to a pending seller', () => {
    show({ status: ApplicationStatus.pendingReview, businessName: 'Bindi', abn: '51824753556', submittedAt: '2026-07-25T02:00:00.000Z' })
    expect(screen.getByRole('heading', { level: 1, name: 'Your application is under review' })).toBeInTheDocument()
  })

  it('shows the not-approved screen to a rejected seller', () => {
    show({
      status: ApplicationStatus.rejected,
      businessName: 'Bindi',
      rejectionReason: 'ABN could not be verified',
      reviewedAt: null,
      supportContact: { email: 'partners@sampleassist.com.au', phone: null },
    })
    expect(screen.getByRole('heading', { level: 1, name: 'Your application was not approved' })).toBeInTheDocument()
  })

  it('shows the one-time notice to a newly approved seller', () => {
    show({ status: ApplicationStatus.approved, businessName: 'Bindi', approvedAt: null, acknowledged: false })
    expect(screen.getByRole('heading', { level: 1, name: "You're approved — welcome aboard" })).toBeInTheDocument()
  })

  it('sends an approved seller who has seen the notice to the dashboard', () => {
    show({ status: ApplicationStatus.approved, businessName: 'Bindi', approvedAt: null, acknowledged: true })
    expect(screen.getByText('the dashboard')).toBeInTheDocument()
  })
})
