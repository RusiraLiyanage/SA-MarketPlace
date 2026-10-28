import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import SupplierFilters from 'src/pages/Suppliers/components/SupplierFilters'
import { renderWithTheme } from 'src/test/renderWithTheme'

const counts = { all: 6, pendingReview: 3, approved: 2, rejected: 1 }

describe('SupplierFilters', () => {
  it('shows the number of applications on each chip, and the chosen one is pressed', () => {
    renderWithTheme(<SupplierFilters search="" status="pending_review" counts={counts} onSearch={vi.fn()} onStatusChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'All 6' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Pending review 3' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Approved 2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rejected 1' })).toBeInTheDocument()
  })

  it('shows plain chips until the counts have loaded', () => {
    renderWithTheme(<SupplierFilters search="" status="all" onSearch={vi.fn()} onStatusChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pending review' })).toBeInTheDocument()
  })

  it('reports the chip pressed', async () => {
    const onStatusChange = vi.fn()
    renderWithTheme(<SupplierFilters search="" status="all" counts={counts} onSearch={vi.fn()} onStatusChange={onStatusChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Rejected 1' }))

    expect(onStatusChange).toHaveBeenCalledWith('rejected')
  })

  it('searches on Enter, and again with nothing when the box is cleared', async () => {
    const onSearch = vi.fn()
    renderWithTheme(<SupplierFilters search="bindi" status="all" counts={counts} onSearch={onSearch} onStatusChange={vi.fn()} />)

    const box = screen.getByRole('searchbox', { name: 'Search suppliers' })
    await userEvent.clear(box)
    expect(onSearch).toHaveBeenLastCalledWith('')

    await userEvent.type(box, '  51 824 {Enter}')
    expect(onSearch).toHaveBeenLastCalledWith('51 824')
  })
})
