import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { setupStore, type AppStore } from 'src/store'
import TestProviders from 'src/test/TestProviders'

// Renders `ui` inside a memory router at `path`; pass `routes` to give other URLs somewhere to land.
export const renderWithRouter = (
  ui: ReactElement,
  path = '/',
  routes: RouteObject[] = [],
  store: AppStore = setupStore(),
) => {
  const router = createMemoryRouter([{ path: '*', element: ui }, ...routes], { initialEntries: [path] })
  render(
    <TestProviders store={store}>
      <RouterProvider router={router} />
    </TestProviders>,
  )
  return router
}
