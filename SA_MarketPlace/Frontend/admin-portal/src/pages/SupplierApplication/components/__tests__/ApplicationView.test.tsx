import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import ApplicationView from 'src/pages/SupplierApplication/components/ApplicationView'
import { application } from 'src/test/applicationFixture'
import { renderWithRouter } from 'src/test/renderWithRouter'

const show = (overrides = {}) =>
  renderWithRouter(<ApplicationView application={application(overrides)} />, '/suppliers/sup-1', [
    { path: '/suppliers/sup-1/approve', element: <p>approve pop-up</p> },
    { path: '/suppliers/sup-1/reject', element: <p>reject pop-up</p> },
  ])

describe('ApplicationView: a pending application', () => {
  it('shows the business, the contact, and the status beside the title', () => {
    show()

    expect(screen.getByRole('heading', { level: 1, name: 'Supplier application' })).toBeInTheDocument()
    expect(screen.getByText('Pending review')).toBeInTheDocument()
    expect(screen.getByText('Bindi MedSupply Pty Ltd')).toBeInTheDocument()
    expect(screen.getByText('51 824 753 556')).toBeInTheDocument()
    expect(screen.getByText('Private company')).toBeInTheDocument()
    expect(screen.getByText('25 Jul 2026')).toBeInTheDocument()
    expect(screen.getByText('Priya Nair')).toBeInTheDocument()
    expect(screen.getByText('priya@bindimedsupply.com.au')).toBeInTheDocument()
    expect(screen.getByText('+61 2 8000 1234')).toBeInTheDocument()
  })

  it('says "None yet" for categories (they come from products), and leaves out a role the backend does not hold', () => {
    show()

    expect(screen.getByText('None yet')).toBeInTheDocument()
    expect(screen.queryByText(/Role/)).not.toBeInTheDocument()
  })

  it('says so when the supplier gave no business type or phone', () => {
    show({ businessType: null, contactPhone: null })

    expect(screen.getByText('Not given')).toBeInTheDocument()
    expect(screen.getByText('Not provided')).toBeInTheDocument()
  })

  it('keeps Approve disabled, and says why, until all three checks are ticked', async () => {
    show()

    const boxes = screen.getAllByRole('checkbox')
    const approve = screen.getByRole('button', { name: 'Approve supplier' })
    expect(boxes).toHaveLength(3)
    expect(boxes.every((box) => !(box as HTMLInputElement).checked)).toBe(true)
    expect(approve).toBeDisabled()
    expect(approve).toHaveAccessibleDescription(/Tick all three checks to enable Approve supplier/)
    expect(screen.getByRole('button', { name: 'Reject' })).toBeEnabled()

    await userEvent.click(boxes[0]!)
    await userEvent.click(boxes[1]!)
    expect(approve).toBeDisabled()

    await userEvent.click(boxes[2]!)
    expect(approve).toBeEnabled()
    expect(approve).toHaveAccessibleDescription(/All checks done/)

    await userEvent.click(boxes[1]!)
    expect(approve).toBeDisabled()
  })

  it('opens the approve and reject pop-ups', async () => {
    const router = show()

    expect(screen.getByRole('button', { name: 'Approve supplier' })).toBeDisabled()
    for (const box of screen.getAllByRole('checkbox')) await userEvent.click(box)
    await userEvent.click(screen.getByRole('button', { name: 'Approve supplier' }))
    expect(router.state.location.pathname).toBe('/suppliers/sup-1/approve')

    await act(async () => {
      await router.navigate('/suppliers/sup-1')
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Reject' }))
    expect(router.state.location.pathname).toBe('/suppliers/sup-1/reject')
  })
})

describe('ApplicationView: a decided application', () => {
  it('shows who approved it and when, with no buttons and no checklist', () => {
    show({ status: 'approved', reviewedAt: '2026-06-01T02:00:00.000Z', reviewedByName: 'Alex Morgan', productCategories: ['Collection Kits', 'Supplies'] })

    // The status tag by the title and the Decision row both say it.
    expect(screen.getAllByText('Approved')).toHaveLength(2)
    expect(screen.getByText('Collection Kits, Supplies')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Decision' })).toBeInTheDocument()
    expect(screen.getByText('Alex Morgan')).toBeInTheDocument()
    expect(screen.getByText('01 Jun 2026')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve supplier' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('shows the reason a rejected applicant was given', () => {
    show({ status: 'rejected', reviewedAt: '2026-05-02T02:00:00.000Z', reviewedByName: 'Alex Morgan', rejectionReason: 'ABN could not be verified. Digits do not match.' })

    expect(screen.getAllByText('Rejected')).toHaveLength(2)
    expect(screen.getByText('ABN could not be verified. Digits do not match.')).toBeInTheDocument()
  })
})
