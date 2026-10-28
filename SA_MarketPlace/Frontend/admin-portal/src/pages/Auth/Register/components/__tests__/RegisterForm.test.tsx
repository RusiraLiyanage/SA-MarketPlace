import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import RegisterForm from 'src/pages/Auth/Register/components/RegisterForm'
import { renderWithTheme } from 'src/test/renderWithTheme'

const fill = async (labelPattern: RegExp, value: string) => userEvent.type(screen.getByLabelText(labelPattern), value)

const fillEverything = async () => {
  await fill(/^Full name/, 'Alex Morgan')
  await fill(/^Work email address/, 'a.morgan@sampleassist.com.au')
  await fill(/^Password/, 'Passw0rd!2026')
  await fill(/^Confirm password/, 'Passw0rd!2026')
  await userEvent.click(screen.getByRole('checkbox'))
}

describe('RegisterForm', () => {
  it('asks for every field and the terms before submitting', async () => {
    const onSubmit = vi.fn()
    renderWithTheme(<RegisterForm onSubmit={onSubmit} />)

    await userEvent.click(screen.getByRole('button', { name: 'Create admin account' }))

    expect(await screen.findByText('Enter your full name')).toBeInTheDocument()
    expect(screen.getByText('Enter your email address')).toBeInTheDocument()
    expect(screen.getByText('Enter a password')).toBeInTheDocument()
    expect(screen.getByText('You must accept the terms to register')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('has no invitation code, which the backend dropped, and says who may register', () => {
    renderWithTheme(<RegisterForm />)

    expect(screen.queryByLabelText(/Invitation/i)).not.toBeInTheDocument()
    expect(screen.getByText('Only Sample Assist staff email addresses can register.')).toBeInTheDocument()
  })

  it('rejects a one-word name, a weak password and mismatched passwords', async () => {
    renderWithTheme(<RegisterForm onSubmit={vi.fn()} />)

    await fill(/^Full name/, 'Alex')
    await fill(/^Password/, 'weak')
    await fill(/^Confirm password/, 'Different1!')
    await userEvent.click(screen.getByRole('button', { name: 'Create admin account' }))

    expect(await screen.findByText('Enter your first and last name')).toBeInTheDocument()
    expect(screen.getAllByText(/At least 8 characters with an uppercase letter/).length).toBeGreaterThan(0)
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
  })

  it('submits what was typed', async () => {
    const onSubmit = vi.fn()
    renderWithTheme(<RegisterForm onSubmit={onSubmit} />)

    await fillEverything()
    await userEvent.click(screen.getByRole('button', { name: 'Create admin account' }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      fullName: 'Alex Morgan',
      email: 'a.morgan@sampleassist.com.au',
      password: 'Passw0rd!2026',
      acceptTerms: true,
    })
  })
})
