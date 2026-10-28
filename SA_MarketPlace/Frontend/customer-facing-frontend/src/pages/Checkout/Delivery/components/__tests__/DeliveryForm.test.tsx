import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DeliveryForm from 'src/pages/Checkout/Delivery/components/DeliveryForm'
import { renderWithTheme } from 'src/test/renderWithTheme'

const renderForm = (onSubmit = vi.fn()) => {
  renderWithTheme(
    <>
      <DeliveryForm formId="delivery-form" organisationName="SA Clinics Pty Ltd" onSubmit={onSubmit} />
      <button type="submit" form="delivery-form">
        Continue
      </button>
    </>,
  )
  return onSubmit
}

describe('DeliveryForm', () => {
  it('shows the organisation and country as fixed and starts on NSW', () => {
    renderForm()

    expect(screen.getByDisplayValue('SA Clinics Pty Ltd')).toBeDisabled()
    expect(screen.getByDisplayValue('Australia')).toBeDisabled()
    expect(screen.getByText('NSW')).toBeInTheDocument()
  })

  it('needs a street address, suburb and a four-digit postcode', async () => {
    const onSubmit = renderForm()

    await userEvent.type(screen.getByLabelText(/^Postcode/), '25')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('Enter your street address')).toBeInTheDocument()
    expect(screen.getByText('Enter your suburb')).toBeInTheDocument()
    expect(screen.getByText('Postcode must be 4 digits')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the address, with the attention name and notes optional', async () => {
    const onSubmit = renderForm()

    await userEvent.type(screen.getByLabelText(/^Street address/), '12 Flinders Street')
    await userEvent.type(screen.getByLabelText(/^Suburb/), 'North Wollongong')
    await userEvent.type(screen.getByLabelText(/^Postcode/), '2500')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      streetAddress: '12 Flinders Street',
      suburb: 'North Wollongong',
      state: 'NSW',
      postcode: '2500',
    })
  })
})
