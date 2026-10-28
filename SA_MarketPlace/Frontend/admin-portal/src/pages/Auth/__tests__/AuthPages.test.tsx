import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from 'src/pages/Auth/Login'
import RegisterPage from 'src/pages/Auth/Register'
import { renderWithRouter } from 'src/test/renderWithRouter'

const login = vi.fn()
const register = vi.fn()
const backend = vi.hoisted(() => ({ loginError: undefined as unknown, registerError: undefined as unknown }))
vi.mock('src/store/auth/actions', () => ({
  useLoginMutation: () => [login, { isLoading: false, error: backend.loginError }],
  useRegisterMutation: () => [register, { isLoading: false, error: backend.registerError }],
}))

describe('LoginPage', () => {
  beforeEach(() => {
    login.mockReset()
    backend.loginError = undefined
  })

  it('says who it is for and signs in with the email and password', async () => {
    renderWithRouter(<LoginPage />, '/login')

    expect(screen.getByRole('heading', { level: 1, name: 'Admin sign in' })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/^Work email address/), 'a.morgan@sampleassist.com.au')
    await userEvent.type(screen.getByLabelText(/^Password/), 'Password123!')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await vi.waitFor(() => expect(login).toHaveBeenCalledWith({ email: 'a.morgan@sampleassist.com.au', password: 'Password123!' }))
  })

  it("shows the backend's refusal, for example a seller trying to sign in here", () => {
    backend.loginError = { status: 403, code: 'ECB403', message: 'You do not have access to this app' }
    renderWithRouter(<LoginPage />, '/login')

    expect(screen.getByText('You do not have access to this app')).toBeInTheDocument()
  })

  it('says the wait when there have been too many attempts', () => {
    backend.loginError = { status: 429, code: 'ECB429', message: 'ThrottlerException' }
    renderWithRouter(<LoginPage />, '/login')

    expect(screen.getByText('Too many attempts. Please wait a minute and try again.')).toBeInTheDocument()
  })
})

describe('RegisterPage', () => {
  beforeEach(() => {
    register.mockReset()
    backend.registerError = undefined
  })

  it('sends only what the backend takes: the name, email, password and the terms, never the confirm box', async () => {
    renderWithRouter(<RegisterPage />, '/register')

    await userEvent.type(screen.getByLabelText(/^Full name/), '  Alex Morgan ')
    await userEvent.type(screen.getByLabelText(/^Work email address/), 'a.morgan@sampleassist.com.au')
    await userEvent.type(screen.getByLabelText(/^Password/), 'Passw0rd!2026')
    await userEvent.type(screen.getByLabelText(/^Confirm password/), 'Passw0rd!2026')
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Create admin account' }))

    await vi.waitFor(() => expect(register).toHaveBeenCalledOnce())
    expect(register).toHaveBeenCalledWith({
      fullName: 'Alex Morgan',
      email: 'a.morgan@sampleassist.com.au',
      password: 'Passw0rd!2026',
      acceptTerms: true,
    })
  })

  it('shows why an address was refused', () => {
    backend.registerError = { status: 400, code: 'ECB001', message: 'Admin accounts are only available to Sample Assist staff email addresses' }
    renderWithRouter(<RegisterPage />, '/register')

    expect(screen.getByText('Admin accounts are only available to Sample Assist staff email addresses')).toBeInTheDocument()
  })
})
