import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import RegisterForm from 'src/pages/Auth/Register/components/RegisterForm'
import { renderWithTheme } from 'src/test/renderWithTheme'

const fill = async (labelPattern: RegExp, value: string) => userEvent.type(screen.getByLabelText(labelPattern), value)

const fillEverything = async () => {
  await fill(/^Business \/ trading name/, 'Acme Supplies Pty Ltd')
  await fill(/^ABN/, '51824753556')
  await fill(/^Contact name/, 'Jamie Lee')
  await fill(/^Phone number/, '0400 111 222')
  await fill(/^Email address/, 'jamie@acme.com.au')
  await fill(/^Password/, 'Passw0rd!2026')
  await fill(/^Confirm password/, 'Passw0rd!2026')
  await userEvent.click(screen.getByRole('checkbox'))
}

describe('RegisterForm', () => {
  it('asks for every required field and the authorisation before submitting', async () => {
    const onSubmit = vi.fn()
    renderWithTheme(<RegisterForm onSubmit={onSubmit} />)

    await userEvent.click(screen.getByRole('button', { name: 'Submit for review' }))

    expect(await screen.findByText('Enter your business name')).toBeInTheDocument()
    expect(screen.getByText('Enter your ABN')).toBeInTheDocument()
    expect(screen.getByText('Enter your full name')).toBeInTheDocument()
    expect(screen.getByText('Enter a phone number')).toBeInTheDocument()
    expect(screen.getByText('Enter your email address')).toBeInTheDocument()
    expect(screen.getByText('Confirm that you are authorised to register this business')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not offer the fields the backend would reject (role, product categories)', () => {
    renderWithTheme(<RegisterForm />)

    expect(screen.queryByLabelText(/Role/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Product categories/)).not.toBeInTheDocument()
  })

  it('spaces the ABN as it is typed', async () => {
    renderWithTheme(<RegisterForm />)

    await fill(/^ABN/, '51824753556')

    expect(screen.getByLabelText(/^ABN/)).toHaveValue('51 824 753 556')
  })

  it('rejects an ABN with a wrong checksum, a single-word name and mismatched passwords', async () => {
    renderWithTheme(<RegisterForm onSubmit={vi.fn()} />)

    await fill(/^ABN/, '51824753557')
    await fill(/^Contact name/, 'Jamie')
    await fill(/^Password/, 'Passw0rd!2026')
    await fill(/^Confirm password/, 'Different1!')
    await userEvent.click(screen.getByRole('button', { name: 'Submit for review' }))

    expect(await screen.findByText('Enter a valid 11-digit ABN')).toBeInTheDocument()
    expect(screen.getByText('Enter your first and last name')).toBeInTheDocument()
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
  })

  it('submits what was typed, with the ABN as typed (the page sends the digits)', async () => {
    const onSubmit = vi.fn()
    renderWithTheme(<RegisterForm onSubmit={onSubmit} />)

    await fillEverything()
    await userEvent.click(screen.getByRole('button', { name: 'Submit for review' }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      businessName: 'Acme Supplies Pty Ltd',
      abn: '51 824 753 556',
      contactName: 'Jamie Lee',
      phone: '0400 111 222',
      email: 'jamie@acme.com.au',
      password: 'Passw0rd!2026',
      confirmAuthorised: true,
    })
  })
})
