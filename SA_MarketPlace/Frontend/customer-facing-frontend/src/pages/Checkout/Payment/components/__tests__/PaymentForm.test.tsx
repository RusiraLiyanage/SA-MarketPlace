import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import PaymentForm from 'src/pages/Checkout/Payment/components/PaymentForm'
import { renderWithTheme } from 'src/test/renderWithTheme'

const renderForm = () => {
  const onSubmit = vi.fn()
  renderWithTheme(
    <>
      <PaymentForm formId="payment-form" onSubmit={onSubmit} />
      <button type="submit" form="payment-form">
        Pay
      </button>
    </>,
  )
  return onSubmit
}

const fill = async ({ name = 'Jordan Shaw', number = '4242424242424242', expiry = '1230', cvc = '123' } = {}) => {
  await userEvent.type(screen.getByLabelText(/^Name on card/), name)
  await userEvent.type(screen.getByLabelText(/^Card number/), number)
  await userEvent.type(screen.getByLabelText(/^Expiry date/), expiry)
  await userEvent.type(screen.getByLabelText(/^CVC/), cvc)
}

describe('PaymentForm', () => {
  it('starts on the mock card and explains it is a sandbox', () => {
    renderForm()

    expect(screen.getByRole('radio', { name: 'Credit / debit card (mock)' })).toBeChecked()
    expect(screen.getByText(/mock sandbox payment/)).toBeInTheDocument()
  })

  it('hides the card fields for invoice on account', async () => {
    renderForm()

    await userEvent.click(screen.getByRole('radio', { name: 'Invoice on account' }))

    expect(screen.queryByLabelText(/^Card number/)).not.toBeInTheDocument()
  })

  it('formats the card number and expiry as they are typed', async () => {
    renderForm()

    await userEvent.type(screen.getByLabelText(/^Card number/), '4242424242424242')
    await userEvent.type(screen.getByLabelText(/^Expiry date/), '1230')

    expect(screen.getByLabelText(/^Card number/)).toHaveValue('4242 4242 4242 4242')
    expect(screen.getByLabelText(/^Expiry date/)).toHaveValue('12 / 30')
  })

  it('requires every card detail', async () => {
    const onSubmit = renderForm()

    await userEvent.click(screen.getByRole('button', { name: 'Pay' }))

    expect(await screen.findByText('Enter the name on the card')).toBeInTheDocument()
    expect(screen.getByText('Enter the card number')).toBeInTheDocument()
    expect(screen.getByText('Enter the expiry date')).toBeInTheDocument()
    expect(screen.getByText('Enter the CVC')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a card number that fails the check, such as one with a digit missing', async () => {
    renderForm()

    await fill({ number: '242424242424242' })
    await userEvent.click(screen.getByRole('button', { name: 'Pay' }))

    expect(await screen.findByText('Enter a valid card number')).toBeInTheDocument()
  })

  it('rejects an expired card and a bad CVC', async () => {
    renderForm()

    await fill({ expiry: '0120', cvc: '12' })
    await userEvent.click(screen.getByRole('button', { name: 'Pay' }))

    expect(await screen.findByText('This card has expired')).toBeInTheDocument()
    expect(screen.getByText('CVC must be 3 or 4 digits')).toBeInTheDocument()
  })

  it('submits the card details', async () => {
    const onSubmit = renderForm()

    await fill()
    await userEvent.click(screen.getByRole('button', { name: 'Pay' }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      method: 'card_mock',
      nameOnCard: 'Jordan Shaw',
      number: '4242 4242 4242 4242',
      expiry: '12 / 30',
      cvc: '123',
    })
  })

  it('submits invoice on account without a card', async () => {
    const onSubmit = renderForm()

    await userEvent.click(screen.getByRole('radio', { name: 'Invoice on account' }))
    await userEvent.click(screen.getByRole('button', { name: 'Pay' }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({ method: 'invoice_on_account' })
  })
})
