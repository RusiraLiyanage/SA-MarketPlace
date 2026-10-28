import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import SABreadcrumb from 'src/components/SABreadcrumb'
import type { RouteHandle } from 'src/router/handle'

const renderAt = (path: string) => {
  const router = createMemoryRouter(
    [
      {
        element: <SABreadcrumb />,
        children: [
          {
            path: '/orders',
            element: <div />,
            handle: { crumbs: () => [{ title: 'Orders' }] } satisfies RouteHandle,
          },
          { path: '/profile', element: <div /> },
          {
            path: '/orders/:orderNumber',
            element: <div />,
            handle: {
              crumbs: (params) => [
                { title: 'Orders', to: '/orders' },
                { title: params.orderNumber ?? '' },
              ],
            } satisfies RouteHandle,
          },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  return render(<RouterProvider router={router} />)
}

describe('SABreadcrumb', () => {
  it('shows the trail from the matched route, linking all but the last', () => {
    renderAt('/orders/ORD-2026-00123')

    expect(screen.getByRole('link', { name: 'Orders' })).toHaveAttribute('href', '/orders')
    expect(screen.getByText('ORD-2026-00123')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'ORD-2026-00123' })).not.toBeInTheDocument()
    expect(screen.queryByText('Home')).not.toBeInTheDocument()
  })

  it('shows nothing for a trail of one, which would only repeat the page title', () => {
    renderAt('/orders')
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('shows nothing on a route without crumbs', () => {
    renderAt('/profile')
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})
