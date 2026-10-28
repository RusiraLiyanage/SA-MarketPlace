import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DispatchQueue from 'src/pages/Dashboard/components/DispatchQueue'
import type { PaginatedData } from 'src/infra/pagination'
import type { DispatchQueueRow } from 'src/store/dashboard/types'
import { renderWithRouter } from 'src/test/renderWithRouter'

const row = (overrides: Partial<DispatchQueueRow> = {}): DispatchQueueRow => ({
  orderNumber: 'ORD-2026-00126',
  organisationName: 'WorkSafe Pty Ltd',
  placedAt: '2026-06-17T02:00:00.000Z',
  itemCount: 3,
  slaDueAt: '2026-06-19T02:00:00.000Z',
  slaHoursLeft: 36,
  ...overrides,
})

const page = (data: DispatchQueueRow[], totalPage = 1): PaginatedData<DispatchQueueRow> => ({
  data,
  pagingMeta: { page: 1, limit: 10, totalItem: data.length, totalPage, hasPreviousPage: false, hasNextPage: totalPage > 1 },
})

describe('DispatchQueue', () => {
  it('lists each order with its organisation, date, item count and SLA badge', () => {
    renderWithRouter(<DispatchQueue queue={page([row(), row({ orderNumber: 'ORD-2026-00125', organisationName: 'Mining Co Pty Ltd', placedAt: '2026-06-16T02:00:00.000Z', itemCount: 1, slaHoursLeft: -20 })])} onPageChange={vi.fn()} />)

    expect(screen.getByRole('link', { name: 'ORD-2026-00126' })).toHaveAttribute('href', '/orders/ORD-2026-00126')
    expect(screen.getByText('WorkSafe Pty Ltd')).toBeInTheDocument()
    expect(screen.getByText('Mining Co Pty Ltd')).toBeInTheDocument()
    expect(screen.getByText('17 Jun 2026')).toBeInTheDocument()
    expect(screen.getByText('16 Jun 2026')).toBeInTheDocument()
    expect(screen.getByText('3 items')).toBeInTheDocument()
    expect(screen.getByText('1 item')).toBeInTheDocument()
    expect(screen.getByText('36h left')).toBeInTheDocument()
    expect(screen.getByText('Overdue by 20h')).toBeInTheDocument()
  })

  it('says so when the buyer has no organisation', () => {
    renderWithRouter(<DispatchQueue queue={page([row({ organisationName: null })])} onPageChange={vi.fn()} />)
    expect(screen.getByText('No organisation')).toBeInTheDocument()
  })

  it('opens the order when Dispatch is pressed', async () => {
    const router = renderWithRouter(<DispatchQueue queue={page([row()])} onPageChange={vi.fn()} />, '/')

    await userEvent.click(screen.getByRole('button', { name: 'Dispatch ORD-2026-00126' }))

    expect(router.state.location.pathname).toBe('/orders/ORD-2026-00126')
  })

  it('has an empty state', () => {
    renderWithRouter(<DispatchQueue queue={page([])} onPageChange={vi.fn()} />)
    expect(screen.getByText('No orders to dispatch right now')).toBeInTheDocument()
  })

  it('shows no paging for a single page', () => {
    renderWithRouter(<DispatchQueue queue={page([row()], 1)} onPageChange={vi.fn()} />)
    expect(screen.queryByText(/\d of \d/)).not.toBeInTheDocument()
  })

  it('shows paging when there is more than one page', () => {
    renderWithRouter(<DispatchQueue queue={page([row()], 3)} onPageChange={vi.fn()} />)
    expect(screen.getByText('1 of 3')).toBeInTheDocument()
  })

  it('says the orders could not be loaded, with a retry, instead of an empty table', async () => {
    const onRetry = vi.fn()
    renderWithRouter(<DispatchQueue error={{ status: 500, code: 'UNKNOWN', message: 'Something broke' }} onRetry={onRetry} onPageChange={vi.fn()} />)

    expect(screen.getByText('We could not load the orders to dispatch')).toBeInTheDocument()
    expect(screen.queryByText('No orders to dispatch right now')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(onRetry).toHaveBeenCalled()
  })

  it('keeps showing the orders it has when a later page fails to load', () => {
    renderWithRouter(<DispatchQueue queue={page([row()])} error={{ status: 500, code: 'UNKNOWN', message: 'Something broke' }} onPageChange={vi.fn()} />)

    expect(screen.getByRole('link', { name: 'ORD-2026-00126' })).toBeInTheDocument()
  })

  describe('a long list', () => {
    const rows = (count: number) => Array.from({ length: count }, (_, i) => row({ orderNumber: `ORD-2026-${String(100 + i).padStart(5, '0')}` }))

    it('scrolls inside the card, under a fixed header, once it passes six orders', () => {
      renderWithRouter(<DispatchQueue queue={page(rows(8))} onPageChange={vi.fn()} />)

      expect(document.querySelector('.ant-table-body')).toHaveStyle({ maxHeight: '400px' })
      expect(screen.getAllByRole('link')).toHaveLength(8)
    })

    it('does not scroll at six orders or fewer', () => {
      renderWithRouter(<DispatchQueue queue={page(rows(6))} onPageChange={vi.fn()} />)

      expect(document.querySelector('.ant-table-body')).not.toBeInTheDocument()
    })
  })
})
