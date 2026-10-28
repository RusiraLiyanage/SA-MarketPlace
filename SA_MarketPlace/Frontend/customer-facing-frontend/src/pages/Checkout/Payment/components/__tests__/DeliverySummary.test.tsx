import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DeliverySummary from 'src/pages/Checkout/Payment/components/DeliverySummary'
import { renderWithTheme } from 'src/test/renderWithTheme'

describe('DeliverySummary', () => {
  it('shows where the order is going and lets the buyer edit it', async () => {
    const onEdit = vi.fn()
    renderWithTheme(
      <DeliverySummary
        organisationName="SA Clinics Pty Ltd"
        delivery={{ streetAddress: '12 Flinders Street', suburb: 'North Wollongong', state: 'NSW', postcode: '2500' }}
        onEdit={onEdit}
      />,
    )

    expect(screen.getByText('SA Clinics Pty Ltd · 12 Flinders Street, North Wollongong NSW 2500')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalled()
  })
})
