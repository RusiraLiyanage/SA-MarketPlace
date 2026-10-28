import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ApprovedRoute from 'src/auth/ApprovedRoute'
import { useGetApplicationQuery } from 'src/store/application/actions'
import { ApplicationStatus, type Application } from 'src/store/application/types'
import { renderWithRouter } from 'src/test/renderWithRouter'

vi.mock('src/store/application/actions', () => ({ useGetApplicationQuery: vi.fn() }))

const query = (state: { data?: Application; error?: unknown; isLoading?: boolean }) =>
  vi.mocked(useGetApplicationQuery).mockReturnValue({ refetch: vi.fn(), ...state } as unknown as ReturnType<typeof useGetApplicationQuery>)

const routes = [
  { element: <ApprovedRoute />, children: [{ path: '/orders', element: <p>the orders page</p> }] },
  { path: '/application', element: <p>the application screen</p> },
]

const show = () => renderWithRouter(<div />, '/orders', routes)

describe('ApprovedRoute', () => {
  beforeEach(() => vi.mocked(useGetApplicationQuery).mockReset())

  it('shows the page to an approved seller who has seen the notice', () => {
    query({ data: { status: ApplicationStatus.approved, businessName: 'B', approvedAt: null, acknowledged: true } })
    show()
    expect(screen.getByText('the orders page')).toBeInTheDocument()
  })

  it.each([
    ['a newly approved seller', { status: ApplicationStatus.approved, businessName: 'B', approvedAt: null, acknowledged: false }],
    ['a pending seller', { status: ApplicationStatus.pendingReview, businessName: 'B', abn: '51824753556', submittedAt: '2026-07-25T00:00:00.000Z' }],
    ['a rejected seller', { status: ApplicationStatus.rejected, businessName: 'B', rejectionReason: null, reviewedAt: null, supportContact: { email: 'a@b.c', phone: null } }],
  ] as const)('sends %s to the application screen', (_who, application) => {
    query({ data: application })
    show()
    expect(screen.getByText('the application screen')).toBeInTheDocument()
  })

  it('shows a loading outline while the status is being fetched, and neither page', () => {
    query({ isLoading: true })
    show()
    expect(screen.getAllByRole('status', { name: 'Loading' }).length).toBeGreaterThan(0)
    expect(screen.queryByText('the orders page')).not.toBeInTheDocument()
  })

  it('offers another try when the status cannot be loaded, instead of letting the seller in', () => {
    query({ error: { status: 0, code: 'NETWORK', message: 'Cannot reach the server.' } })
    show()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.queryByText('the orders page')).not.toBeInTheDocument()
  })
})
