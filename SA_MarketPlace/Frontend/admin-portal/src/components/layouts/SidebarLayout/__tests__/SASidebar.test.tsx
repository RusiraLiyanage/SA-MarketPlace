import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import SASidebar from 'src/components/layouts/SidebarLayout/SASidebar'
import { renderWithRouter } from 'src/test/renderWithRouter'

const original = window.matchMedia

afterEach(() => {
  window.matchMedia = original
})

// The window is wide (a desktop) or narrow; the sidebar answers to the media query.
const setWide = (wide: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: wide,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
}

const renderAt = (path: string, pendingApplications = 0) => renderWithRouter(<SASidebar pendingApplications={pendingApplications} />, path)

describe('SASidebar on a wide screen', () => {
  it('shows the app name and the three sections', () => {
    setWide(true)
    renderAt('/suppliers')

    expect(screen.getByText('SA Admin')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    for (const name of ['Suppliers', 'Orders', 'My Profile']) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: 'Open menu' })).not.toBeInTheDocument()
  })

  it.each([
    ['/suppliers', 'Suppliers'],
    ['/suppliers/6d1f0e1c-0000-4000-8000-000000000001', 'Suppliers'],
    ['/orders', 'Orders'],
    ['/orders/ORD-2026-00126', 'Orders'],
    ['/profile', 'My Profile'],
  ])('marks the section for %s as the current page', (path, section) => {
    setWide(true)
    renderAt(path)

    expect(screen.getByRole('link', { name: section })).toHaveAttribute('aria-current', 'page')
    expect(screen.getAllByRole('link').filter((link) => link.hasAttribute('aria-current'))).toHaveLength(1)
  })

  it('marks no section on a page outside the menu', () => {
    setWide(true)
    renderAt('/403')
    expect(screen.getAllByRole('link').filter((link) => link.hasAttribute('aria-current'))).toHaveLength(0)
  })

  it('shows the number of applications awaiting review on Suppliers', () => {
    setWide(true)
    renderAt('/orders', 3)
    expect(screen.getByRole('link', { name: /Suppliers/ })).toHaveTextContent('3')
  })

  it('shows no badge at 0', () => {
    setWide(true)
    renderAt('/orders', 0)
    expect(screen.getByRole('link', { name: 'Suppliers' })).not.toHaveTextContent(/\d/)
  })
})

describe('SASidebar on a narrow screen', () => {
  it('shows a menu button instead of the sidebar, with the app name beside it', () => {
    setWide(false)
    renderAt('/suppliers')

    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('SA Admin')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Orders' })).not.toBeInTheDocument()
  })

  it('opens the same navigation in a drawer, and closes it when a section is chosen', async () => {
    setWide(false)
    const router = renderAt('/suppliers', 2)

    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Suppliers/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /Suppliers/ })).toHaveTextContent('2')

    await userEvent.click(screen.getByRole('link', { name: 'Orders' }))

    expect(router.state.location.pathname).toBe('/orders')
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false')
  })
})
