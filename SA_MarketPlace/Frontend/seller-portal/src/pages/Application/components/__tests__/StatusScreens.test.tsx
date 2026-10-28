import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Approved from 'src/pages/Application/components/Approved'
import NotApproved from 'src/pages/Application/components/NotApproved'
import UnderReview from 'src/pages/Application/components/UnderReview'
import { ApplicationStatus } from 'src/store/application/types'
import { renderWithRouter } from 'src/test/renderWithRouter'

const acknowledge = vi.fn()
vi.mock('src/store/application/actions', () => ({
  useAcknowledgeApplicationMutation: () => [() => ({ unwrap: acknowledge }), { isLoading: false }],
}))

const rejected = (overrides: Partial<Parameters<typeof NotApproved>[0]['application']> = {}) => ({
  status: ApplicationStatus.rejected,
  businessName: 'Bindi MedSupply Pty Ltd',
  rejectionReason: 'The ABN provided could not be verified against the business name supplied.',
  reviewedAt: '2026-07-24T02:00:00.000Z',
  supportContact: { email: 'partners@sampleassist.com.au', phone: null },
  ...overrides,
})

describe('UnderReview', () => {
  it('shows what was submitted, with the ABN spaced and the date in the designs format', () => {
    renderWithRouter(
      <UnderReview
        application={{ status: ApplicationStatus.pendingReview, businessName: 'Bindi MedSupply Pty Ltd', abn: '51824753556', submittedAt: '2026-07-25T02:00:00.000Z' }}
      />,
    )

    expect(screen.getByText('Bindi MedSupply Pty Ltd')).toBeInTheDocument()
    expect(screen.getByText('51 824 753 556')).toBeInTheDocument()
    expect(screen.getByText('25 Jul 2026')).toBeInTheDocument()
    expect(screen.getByText('Awaiting review')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })

  it('says Sample Assist, not another company, and makes no promise about how long a review takes', () => {
    renderWithRouter(
      <UnderReview application={{ status: ApplicationStatus.pendingReview, businessName: 'B', abn: '51824753556', submittedAt: '2026-07-25T02:00:00.000Z' }} />,
    )

    expect(screen.getByText(/A Sample Assist administrator will review/)).toBeInTheDocument()
    expect(screen.queryByText(/Innosano|business days/)).not.toBeInTheDocument()
  })
})

describe('NotApproved', () => {
  it('shows the admin\'s reason and when it was reviewed', () => {
    renderWithRouter(<NotApproved application={rejected()} />)

    expect(screen.getByText('The ABN provided could not be verified against the business name supplied.')).toBeInTheDocument()
    expect(screen.getByText('24 Jul 2026')).toBeInTheDocument()
  })

  it('says so when no reason was recorded', () => {
    renderWithRouter(<NotApproved application={rejected({ rejectionReason: null, reviewedAt: null })} />)

    expect(screen.getByText('No reason was given. Please contact support.')).toBeInTheDocument()
    expect(screen.queryByText('Reviewed')).not.toBeInTheDocument()
  })

  it('emails support, and shows no phone line when the backend has no number', () => {
    renderWithRouter(<NotApproved application={rejected()} />)

    expect(screen.getByRole('link', { name: 'Contact support' })).toHaveAttribute('href', 'mailto:partners@sampleassist.com.au')
    expect(screen.queryByText(/Or call/)).not.toBeInTheDocument()
  })

  it('shows the phone number when the backend has one', () => {
    renderWithRouter(
      <NotApproved application={rejected({ supportContact: { email: 'partners@sampleassist.com.au', phone: '1800 123 456' } })} />,
    )

    expect(screen.getByText('Or call 1800 123 456')).toBeInTheDocument()
  })

  it('goes to the resubmit form', async () => {
    const router = renderWithRouter(<NotApproved application={rejected()} />, '/application')

    await userEvent.click(screen.getByRole('button', { name: 'Update and resubmit' }))

    expect(router.state.location.pathname).toBe('/application/resubmit')
  })
})

describe('Approved', () => {
  const application = { status: ApplicationStatus.approved, businessName: 'Bindi MedSupply Pty Ltd', approvedAt: '2026-07-27T02:00:00.000Z', acknowledged: false } as const

  it('welcomes the business, with the approval date and a verified tag', () => {
    renderWithRouter(<Approved application={application} />)

    expect(screen.getByText('Bindi MedSupply Pty Ltd is now a verified marketplace supplier.')).toBeInTheDocument()
    expect(screen.getByText('27 Jul 2026')).toBeInTheDocument()
    expect(screen.getByText('Verified supplier')).toBeInTheDocument()
  })

  it('tells the backend the notice was seen, then goes to the dashboard', async () => {
    acknowledge.mockResolvedValue(undefined)
    const router = renderWithRouter(<Approved application={application} />, '/application', [{ path: '/', element: <p>the dashboard</p> }])

    await userEvent.click(screen.getByRole('button', { name: 'Proceed to dashboard' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(acknowledge).toHaveBeenCalledOnce()
  })

  it('stays on the notice when the backend could not record it', async () => {
    acknowledge.mockRejectedValue({ status: 0, code: 'NETWORK', message: 'Cannot reach the server.' })
    const router = renderWithRouter(<Approved application={application} />, '/application', [{ path: '/', element: <p>the dashboard</p> }])

    await userEvent.click(screen.getByRole('button', { name: 'Proceed to dashboard' }))

    expect(await screen.findByText('Cannot reach the server.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/application')
  })
})
