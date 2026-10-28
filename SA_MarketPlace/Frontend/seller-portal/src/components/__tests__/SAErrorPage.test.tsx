import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import SAErrorPage from 'src/components/SAErrorPage'
import { renderWithRouter } from 'src/test/renderWithRouter'

describe('SAErrorPage', () => {
  it('shows the title and sub-title', () => {
    renderWithRouter(<SAErrorPage status="404" title="Page not found" subTitle="It does not exist." />)

    expect(screen.getByText('Page not found')).toBeInTheDocument()
    expect(screen.getByText('It does not exist.')).toBeInTheDocument()
  })

  it('takes the visitor back to the dashboard', async () => {
    const router = renderWithRouter(<SAErrorPage status="500" title="Something went wrong" />, '/broken')

    await userEvent.click(screen.getByRole('button', { name: 'Back to dashboard' }))

    expect(router.state.location.pathname).toBe('/')
  })
})
