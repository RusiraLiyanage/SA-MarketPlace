import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import SAPageHeader from 'src/components/SAPageHeader'
import { setupStore } from 'src/store'
import TestProviders from 'src/test/TestProviders'

const renderHeader = (header: ReactElement) => {
  const router = createMemoryRouter([{ path: '*', element: header }], { initialEntries: ['/'] })
  render(
    <TestProviders store={setupStore()}>
      <RouterProvider router={router} />
    </TestProviders>,
  )
}

describe('SAPageHeader', () => {
  it('shows the one h1, a subtitle and the page actions', () => {
    renderHeader(<SAPageHeader title="Orders" subtitle="Everything placed with you" extra={<button>Add product</button>} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Orders' })).toBeInTheDocument()
    expect(screen.getByText('Everything placed with you')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add product' })).toBeInTheDocument()
  })
})
