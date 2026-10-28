import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import LoginForm from 'src/pages/Auth/Login/components/LoginForm'
import { renderWithRouter } from 'src/test/renderWithRouter'

describe('LoginForm', () => {
  it('asks for both fields before submitting', async () => {
    const onSubmit = vi.fn()
    renderWithRouter(<LoginForm onSubmit={onSubmit} />)

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Enter your email address')).toBeInTheDocument()
    expect(screen.getByText('Enter your password')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects an email that is not an address', async () => {
    renderWithRouter(<LoginForm onSubmit={vi.fn()} />)

    await userEvent.type(screen.getByLabelText(/^Work email address/), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
  })

  it('submits the email and password', async () => {
    const onSubmit = vi.fn()
    renderWithRouter(<LoginForm onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText(/^Work email address/), 'a.morgan@sampleassist.com.au')
    await userEvent.type(screen.getByLabelText(/^Password/), 'Password123!')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ email: 'a.morgan@sampleassist.com.au', password: 'Password123!' }),
    )
  })

  it('links to the forgot password page, and has no "keep me signed in" box (no refresh tokens yet)', () => {
    renderWithRouter(<LoginForm />)

    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/forgot-password')
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })
})
