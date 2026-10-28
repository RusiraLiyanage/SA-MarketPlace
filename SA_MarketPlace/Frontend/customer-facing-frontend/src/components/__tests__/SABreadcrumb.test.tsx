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
          { path: '/shop', element: <div /> },
          {
            path: '/orders/:orderNumber',
            element: <div />,
            handle: {
              crumbs: (params) => [
                { title: 'My orders', to: '/orders' },
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
  it('shows Home, then the trail from the matched route, linking all but the last', () => {
    renderAt('/orders/ORD-2026-00123')

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/shop')
    expect(screen.getByRole('link', { name: 'My orders' })).toHaveAttribute('href', '/orders')
    expect(screen.getByText('ORD-2026-00123')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'ORD-2026-00123' })).not.toBeInTheDocument()
  })

  it('shows nothing on a route without crumbs', () => {
    renderAt('/shop')
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})
