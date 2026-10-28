import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import SuppliersTable from 'src/pages/Suppliers/components/SuppliersTable'
import type { SupplierApplicationListItem } from 'src/store/suppliers/types'
import { renderWithRouter } from 'src/test/renderWithRouter'

const row = (overrides: Partial<SupplierApplicationListItem> = {}): SupplierApplicationListItem => ({
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

const show = (suppliers: SupplierApplicationListItem[], props: Partial<Parameters<typeof SuppliersTable>[0]> = {}) =>
  renderWithRouter(
    <SuppliersTable suppliers={suppliers} status="all" onClearFilters={vi.fn()} onViewApproved={vi.fn()} {...props} />,
    '/suppliers',
  )

describe('SuppliersTable', () => {
  it('shows the business, its spaced ABN, the contact and the date submitted', () => {
    show([row()])

    expect(screen.getByText('Bindi MedSupply Pty Ltd')).toBeInTheDocument()
    expect(screen.getByText('51 824 753 556')).toBeInTheDocument()
    expect(screen.getByText('Priya Nair')).toBeInTheDocument()
    expect(screen.getByText('priya@bindimedsupply.com.au')).toBeInTheDocument()
    expect(screen.getByText('25 Jul 2026')).toBeInTheDocument()
  })

  it('says how long a pending application has waited, and Review opens it', async () => {
    const router = show([row()])

    expect(screen.getByText(/^Waiting/)).toBeInTheDocument()
    expect(screen.getByText('Pending review')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Review Bindi MedSupply Pty Ltd' }))

    expect(router.state.location.pathname).toBe('/suppliers/sup-1')
  })

  it('shows an approved supplier with the date it was reviewed, and View opens it', async () => {
    const router = show([row({ status: 'approved', reviewedAt: '2026-06-01T02:00:00.000Z' })])

    expect(screen.getByText('Approved')).toBeInTheDocument()
    expect(screen.getByText('Reviewed 01 Jun 2026')).toBeInTheDocument()
    expect(screen.queryByText(/^Waiting/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'View Bindi MedSupply Pty Ltd' }))

    expect(router.state.location.pathname).toBe('/suppliers/sup-1')
  })

  it('shows a rejected supplier with the reason the applicant was given', () => {
    show([row({ status: 'rejected', reviewedAt: '2026-05-02T02:00:00.000Z', rejectionReason: 'ABN could not be verified' })])

    expect(screen.getByText('Rejected')).toBeInTheDocument()
    expect(screen.getByText('ABN could not be verified')).toBeInTheDocument()
  })

  describe('when there is nothing to show', () => {
    it('says nothing is waiting on Pending review, and offers the approved suppliers', async () => {
      const onViewApproved = vi.fn()
      show([], { status: 'pending_review', onViewApproved })

      expect(screen.getByText('No applications awaiting review')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'View approved suppliers' }))

      expect(onViewApproved).toHaveBeenCalledOnce()
    })

    it('says nothing matches a search, and clears it', async () => {
      const onClearFilters = vi.fn()
      show([], { status: 'pending_review', searching: true, onClearFilters })

      expect(screen.getByText('No suppliers match')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

      expect(onClearFilters).toHaveBeenCalledOnce()
    })

    it('says nothing matches another status chip', () => {
      show([], { status: 'rejected' })

      expect(screen.getByText('No suppliers match')).toBeInTheDocument()
    })

    it('says there are no suppliers at all on All', () => {
      show([], { status: 'all' })

      expect(screen.getByText('No suppliers yet')).toBeInTheDocument()
    })
  })
})
