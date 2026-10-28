import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import RegisterForm from 'src/pages/Auth/Register/components/RegisterForm'
import { renderWithRouter } from 'src/test/renderWithRouter'

const fill = async (overrides: Partial<Record<string, string>> = {}) => {
  const values = {
    'First name': 'Jordan',
    'Last name': 'Shaw',
    'Work email address': 'j.shaw@saclinics.com.au',
    Organisation: 'SA Clinics Pty Ltd',
    Password: 'Passw0rd!2026',
    'Confirm password': 'Passw0rd!2026',
    ...overrides,
  }
  for (const [label, value] of Object.entries(values)) {
    await userEvent.type(screen.getByLabelText(new RegExp(`^${label}`)), value as string)
  }
}

describe('RegisterForm', () => {
  it('shows the backend password rule as a hint', () => {
    renderWithRouter(<RegisterForm />)
    expect(screen.getByText(/At least 8 characters with an uppercase letter/)).toBeInTheDocument()
  })

  it('requires every field and the terms', async () => {
    const onSubmit = vi.fn()
    renderWithRouter(<RegisterForm onSubmit={onSubmit} />)

    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Enter your first name')).toBeInTheDocument()
    expect(screen.getByText('Enter your last name')).toBeInTheDocument()
    expect(screen.getByText('Enter your organisation')).toBeInTheDocument()
    expect(screen.getByText('You must accept the terms to register')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a password that breaks the rule', async () => {
    renderWithRouter(<RegisterForm onSubmit={vi.fn()} />)

    await fill({ Password: 'password1', 'Confirm password': 'password1' })
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    const errors = await screen.findAllByText(/At least 8 characters with an uppercase letter/)
    expect(errors.length).toBeGreaterThan(1)
  })

  it('rejects a confirm password that does not match', async () => {
    renderWithRouter(<RegisterForm onSubmit={vi.fn()} />)

    await fill({ 'Confirm password': 'Different1!pass' })
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument()
  })

  it('submits the details once everything is valid', async () => {
    const onSubmit = vi.fn()
    renderWithRouter(<RegisterForm onSubmit={onSubmit} />)

    await fill()
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      firstName: 'Jordan',
      lastName: 'Shaw',
      email: 'j.shaw@saclinics.com.au',
      organisation: 'SA Clinics Pty Ltd',
      password: 'Passw0rd!2026',
      acceptTerms: true,
    })
  })
})
