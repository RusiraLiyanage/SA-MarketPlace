import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SuppliersPage from 'src/pages/Suppliers'
import { useGetSupplierSummaryQuery, useListSuppliersQuery } from 'src/store/suppliers/actions'
import type { SupplierApplicationListItem } from 'src/store/suppliers/types'
import { renderWithRouter } from 'src/test/renderWithRouter'

vi.mock('src/store/suppliers/actions', () => ({
  useListSuppliersQuery: vi.fn(),
  useGetSupplierSummaryQuery: vi.fn(),
}))

const refetch = vi.fn()
const supplier = (overrides: Partial<SupplierApplicationListItem> = {}): SupplierApplicationListItem => ({
  id: 'sup-1',
  businessName: 'Bindi MedSupply Pty Ltd',
  abn: '51824753556',
  contactName: 'Priya Nair',
  contactEmail: 'priya@bindimedsupply.com.au',
  submittedAt: '2026-07-25T02:00:00.000Z',
  status: 'pending_review',
  reviewedAt: null,
  rejectionReason: null,
  ...overrides,
})
const list = (data: SupplierApplicationListItem[]) => ({
  data,
  pagingMeta: { page: 1, limit: 10, totalItem: data.length, totalPage: data.length ? 1 : 0, hasPreviousPage: false, hasNextPage: false },
})
const listing = (result: object) => vi.mocked(useListSuppliersQuery).mockReturnValue({ refetch, ...result } as unknown as ReturnType<typeof useListSuppliersQuery>)
const summary = (data: object | undefined) => vi.mocked(useGetSupplierSummaryQuery).mockReturnValue({ data } as unknown as ReturnType<typeof useGetSupplierSummaryQuery>)
const show = (path = '/suppliers') => renderWithRouter(<SuppliersPage />, path)

describe('SuppliersPage', () => {
  beforeEach(() => {
    refetch.mockReset()
    vi.mocked(useListSuppliersQuery).mockReset()
    summary({ all: 6, pendingReview: 3, approved: 2, rejected: 1 })
  })

  it('shows the queue with the banner, the counts and the footnote', () => {
    listing({ data: list([supplier()]) })
    show()

    expect(screen.getByRole('heading', { level: 1, name: 'Supplier verification' })).toBeInTheDocument()
    expect(screen.getByText('3 supplier applications awaiting review — listings stay hidden from buyers until approved')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pending review 3' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Bindi MedSupply Pty Ltd')).toBeInTheDocument()
    expect(screen.getByText(/The applicant is told the outcome by email/)).toBeInTheDocument()
  })

  it('asks the backend for pending applications to start with', () => {
    listing({ data: list([]) })
    show()

    expect(useListSuppliersQuery).toHaveBeenCalledWith({ status: 'pending_review', search: undefined, page: 1, limit: 10 })
  })

  it('has no banner when nothing is waiting', () => {
    summary({ all: 6, pendingReview: 0, approved: 5, rejected: 1 })
    listing({ data: list([]) })
    show()

    expect(screen.queryByText(/awaiting review —/)).not.toBeInTheDocument()
    expect(screen.getByText('No applications awaiting review')).toBeInTheDocument()
  })

  it('still shows the queue, without the numbers, when the counts could not be loaded', () => {
    summary(undefined)
    listing({ data: list([supplier()]) })
    show()

    expect(screen.getByRole('button', { name: 'Pending review' })).toBeInTheDocument()
    expect(screen.getByText('Bindi MedSupply Pty Ltd')).toBeInTheDocument()
  })

  it('changes the address, and the request, when a chip is pressed', async () => {
    listing({ data: list([supplier({ status: 'approved' })]) })
    const router = show()

    await userEvent.click(screen.getByRole('button', { name: 'All 6' }))

    expect(router.state.location.search).toBe('?status=all')
    expect(useListSuppliersQuery).toHaveBeenLastCalledWith({ status: undefined, search: undefined, page: 1, limit: 10 })
  })

  it('goes to the approved suppliers from the empty queue', async () => {
    listing({ data: list([]) })
    const router = show()

    await userEvent.click(screen.getByRole('button', { name: 'View approved suppliers' }))

    expect(router.state.location.search).toBe('?status=approved')
  })

  it('clears a search that found nothing, and shows everyone', async () => {
    listing({ data: list([]) })
    const router = show('/suppliers?search=zzz&status=approved')

    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

    expect(router.state.location.search).toBe('?status=all')
  })

  it('shows a loading state, then an error with a way to retry', async () => {
    listing({ isLoading: true })
    const { unmount } = (() => {
      const router = show()
      return { unmount: () => router.dispose() }
    })()
    expect(screen.queryByText('Bindi MedSupply Pty Ltd')).not.toBeInTheDocument()
    unmount()
  })

  it('offers a retry when the applications could not be loaded', async () => {
    listing({ error: { status: 500, code: 'UNKNOWN', message: 'Something broke' } })
    show()

    expect(screen.getByText('We could not load the supplier applications')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalled()
  })
})
