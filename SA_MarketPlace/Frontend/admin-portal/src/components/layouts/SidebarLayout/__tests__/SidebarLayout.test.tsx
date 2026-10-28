import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SidebarLayout from 'src/components/layouts/SidebarLayout'
import { useGetSupplierSummaryQuery } from 'src/store/suppliers/actions'
import { renderWithRouter } from 'src/test/renderWithRouter'

vi.mock('src/store/suppliers/actions', () => ({ useGetSupplierSummaryQuery: vi.fn() }))

const original = window.matchMedia
beforeEach(() => {
  // A wide window, so the sidebar itself (not the narrow-screen drawer) is drawn.
  window.matchMedia = ((query: string) => ({ matches: true, media: query, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia
})
afterEach(() => {
  window.matchMedia = original
})

const show = (summary: object | undefined) => {
  vi.mocked(useGetSupplierSummaryQuery).mockReturnValue({ data: summary } as unknown as ReturnType<typeof useGetSupplierSummaryQuery>)
  return renderWithRouter(<SidebarLayout />, '/', [{ path: '/', element: <SidebarLayout />, children: [{ index: true, element: <p>the page</p> }] }])
}

describe('SidebarLayout', () => {
  it('shows the page beside the sidebar, with a skip link to it', () => {
    show({ all: 4, pendingReview: 2, approved: 1, rejected: 1 })

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    expect(screen.getAllByText('the page').length).toBeGreaterThan(0)
  })

  it('puts the number of applications awaiting review on Suppliers', () => {
    show({ all: 4, pendingReview: 2, approved: 1, rejected: 1 })

    expect(screen.getByRole('link', { name: /Suppliers/ })).toHaveTextContent('2')
  })

  it('shows no badge while the counts are loading, or when nothing is waiting', () => {
    show(undefined)
    expect(screen.getByRole('link', { name: 'Suppliers' })).not.toHaveTextContent(/\d/)
  })
})
