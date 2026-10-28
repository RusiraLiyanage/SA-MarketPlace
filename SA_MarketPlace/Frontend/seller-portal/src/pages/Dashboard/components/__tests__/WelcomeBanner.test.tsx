import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import WelcomeBanner from 'src/pages/Dashboard/components/WelcomeBanner'
import { renderWithRouter } from 'src/test/renderWithRouter'

describe('WelcomeBanner', () => {
  it('welcomes the business and offers the first thing to do', async () => {
    const router = renderWithRouter(<WelcomeBanner businessName="Bindi MedSupply" />, '/')

    expect(screen.getByText('Welcome to the marketplace, Bindi MedSupply')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Add product/ }))

    expect(router.state.location.pathname).toBe('/catalogue/new')
  })
})
