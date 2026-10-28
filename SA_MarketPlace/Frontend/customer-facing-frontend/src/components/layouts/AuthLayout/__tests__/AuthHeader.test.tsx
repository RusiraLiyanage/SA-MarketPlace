import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AuthHeader from 'src/components/layouts/AuthLayout/AuthHeader'
import { renderWithRouter } from 'src/test/renderWithRouter'

describe('AuthHeader', () => {
  it('invites a new visitor to create an account from the login page', () => {
    renderWithRouter(<AuthHeader />, '/login')

    expect(screen.getByText('New to the marketplace?')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/register')
  })

  it('points to sign in from the register page', () => {
    renderWithRouter(<AuthHeader />, '/register')

    expect(screen.getByText('Already have an account?')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  })

  it('offers sign in on the password pages', () => {
    renderWithRouter(<AuthHeader />, '/forgot-password')
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  })
})
