import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AuthHeader from 'src/components/layouts/AuthLayout/AuthHeader'
import { renderWithRouter } from 'src/test/renderWithRouter'

describe('AuthHeader', () => {
  it('points the sign-in page to registration', () => {
    renderWithRouter(<AuthHeader />, '/login')

    expect(screen.getByText('SELLER PORTAL')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Register your business' })).toHaveAttribute('href', '/register')
  })

  it('points the registration page back to sign in', () => {
    renderWithRouter(<AuthHeader />, '/register')

    expect(screen.getByText('SELLER REGISTRATION')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  })

  it('shows no prompt on the application status screens', () => {
    renderWithRouter(<AuthHeader />, '/application')

    expect(screen.getByText('SELLER REGISTRATION')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Register your business' })).not.toBeInTheDocument()
  })
})
