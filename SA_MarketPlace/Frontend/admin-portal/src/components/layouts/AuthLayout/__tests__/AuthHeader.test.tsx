import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AuthHeader from 'src/components/layouts/AuthLayout/AuthHeader'
import { renderWithRouter } from 'src/test/renderWithRouter'

describe('AuthHeader', () => {
  it('points the sign-in page to creating an account', () => {
    renderWithRouter(<AuthHeader />, '/login')

    expect(screen.getByText('SA ADMIN')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/register')
  })

  it('points the registration page back to sign in', () => {
    renderWithRouter(<AuthHeader />, '/register')

    expect(screen.getByText('SA ADMIN')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  })

  it('shows no prompt on the password pages', () => {
    renderWithRouter(<AuthHeader />, '/forgot-password')

    expect(screen.getByText('SA ADMIN')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create an account' })).not.toBeInTheDocument()
  })
})
