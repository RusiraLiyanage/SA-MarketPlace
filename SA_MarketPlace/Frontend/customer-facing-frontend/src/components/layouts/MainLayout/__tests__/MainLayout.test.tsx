import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import MainLayout from 'src/components/layouts/MainLayout'
import type { RouteHandle } from 'src/router/handle'
import { setupStore } from 'src/store'
import TestProviders from 'src/test/TestProviders'

const renderAt = (path: string) => {
  const router = createMemoryRouter(
    [
      {
        element: <MainLayout />,
        children: [
          { path: '/shop', element: <p>Catalogue page</p> },
          {
            path: '/cart',
            element: <p>Cart page</p>,
            handle: { crumbs: () => [{ title: 'Shopping cart' }] } satisfies RouteHandle,
          },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  render(
    <TestProviders store={setupStore()}>
      <RouterProvider router={router} />
    </TestProviders>,
  )
}

describe('MainLayout', () => {
  it('puts the header above the page', () => {
    renderAt('/shop')

    expect(screen.getByRole('link', { name: 'My Orders' })).toBeInTheDocument()
    expect(screen.getByText('Catalogue page')).toBeInTheDocument()
  })

  it('shows the breadcrumb only for pages that declare one', () => {
    renderAt('/cart')
    expect(screen.getByText('Shopping cart')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
  })

  it('has no breadcrumb on the catalogue', () => {
    renderAt('/shop')
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()
  })
})
