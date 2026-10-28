import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ResubmitForm from 'src/pages/Application/Resubmit/components/ResubmitForm'
import { renderWithTheme } from 'src/test/renderWithTheme'

const initialValues = {
  businessName: 'Bindi MedSupply Pty Ltd',
  abn: '51 824 753 556',
  businessType: 'Wholesaler',
  contactName: 'Priya Nair',
  phone: '0412 000 002',
}

describe('ResubmitForm', () => {
  it('starts with the application as it was submitted, and the sign-in email read-only', () => {
    renderWithTheme(<ResubmitForm email="priya@bindimedsupply.com.au" initialValues={initialValues} />)

    expect(screen.getByLabelText(/^Business \/ trading name/)).toHaveValue('Bindi MedSupply Pty Ltd')
    expect(screen.getByLabelText(/^ABN/)).toHaveValue('51 824 753 556')
    expect(screen.getByLabelText(/^Contact name/)).toHaveValue('Priya Nair')
    expect(screen.getByLabelText('Email address')).toBeDisabled()
    expect(screen.getByLabelText('Email address')).toHaveValue('priya@bindimedsupply.com.au')
  })

  it('has no password fields, which the backend would reject on a resubmit', () => {
    renderWithTheme(<ResubmitForm email="a@b.c" initialValues={initialValues} />)

    expect(screen.queryByLabelText(/Password/)).not.toBeInTheDocument()
  })

  it('needs the authorisation confirmed again before it can be sent', async () => {
    const onSubmit = vi.fn()
    renderWithTheme(<ResubmitForm email="a@b.c" initialValues={initialValues} onSubmit={onSubmit} />)

    await userEvent.click(screen.getByRole('button', { name: 'Resubmit for review' }))

    expect(await screen.findByText('Confirm that you are authorised to register this business')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('sends the corrected details', async () => {
    const onSubmit = vi.fn()
    renderWithTheme(<ResubmitForm email="a@b.c" initialValues={initialValues} onSubmit={onSubmit} />)

    const abn = screen.getByLabelText(/^ABN/)
    await userEvent.clear(abn)
    await userEvent.type(abn, '53004085616')
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Resubmit for review' }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      businessName: 'Bindi MedSupply Pty Ltd',
      abn: '53 004 085 616',
      contactName: 'Priya Nair',
      confirmAuthorised: true,
    })
  })
})
