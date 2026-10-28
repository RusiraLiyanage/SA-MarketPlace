import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ForgotPasswordForm from 'src/pages/Auth/ForgotPassword/components/ForgotPasswordForm'
import { renderWithTheme } from 'src/test/renderWithTheme'

describe('ForgotPasswordForm', () => {
  it('needs an email address', async () => {
    const onSubmit = vi.fn()
    renderWithTheme(<ForgotPasswordForm onSubmit={onSubmit} />)

    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(await screen.findByText('Enter your email address')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the address', async () => {
    const onSubmit = vi.fn()
    renderWithTheme(<ForgotPasswordForm onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText(/^Work email address/), 'a.morgan@sampleassist.com.au')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ email: 'a.morgan@sampleassist.com.au' }))
  })
})
