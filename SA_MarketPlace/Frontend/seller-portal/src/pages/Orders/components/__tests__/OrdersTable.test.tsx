import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import OrdersTable from 'src/pages/Orders/components/OrdersTable'
import type { OrderListItem } from 'src/store/orders/types'
import { renderWithRouter } from 'src/test/renderWithRouter'

const order = (overrides: Partial<OrderListItem> = {}): OrderListItem => ({
  orderNumber: 'ORD-2026-00126',
  organisationName: 'WorkSafe Pty Ltd',
  placedAt: '2026-06-17T02:00:00.000Z',
  itemCount: 3,
  total: '156.00',
  status: 'new',
  canDownloadInvoice: false,
  ...overrides,
})

describe('OrdersTable', () => {
  it('shows each order with its date, items, total and status', () => {
    renderWithRouter(
      <OrdersTable
        orders={[order(), order({ orderNumber: 'ORD-2026-00123', itemCount: 1, total: '445', status: 'dispatched', canDownloadInvoice: true })]}
        onClearFilters={vi.fn()}
      />,
    )

    expect(screen.getByRole('link', { name: 'ORD-2026-00126' })).toHaveAttribute('href', '/orders/ORD-2026-00126')
    expect(screen.getAllByText('WorkSafe Pty Ltd')).toHaveLength(2)
    expect(screen.getAllByText('17 Jun 2026')).toHaveLength(2)
    expect(screen.getByText('3 items')).toBeInTheDocument()
    expect(screen.getByText('1 item')).toBeInTheDocument()
    expect(screen.getByText('$156.00')).toBeInTheDocument()
    expect(screen.getByText('$445.00')).toBeInTheDocument()
    expect(screen.getByText('New')).toBeInTheDocument()
    expect(screen.getByText('Dispatched')).toBeInTheDocument()
  })

  it('links to the order from "View details"', () => {
    renderWithRouter(<OrdersTable orders={[order()]} onClearFilters={vi.fn()} />)
    expect(screen.getByRole('link', { name: 'View details of ORD-2026-00126' })).toHaveAttribute('href', '/orders/ORD-2026-00126')
  })

  it('turns Download invoice off until the order has dispatched', () => {
    renderWithRouter(
      <OrdersTable
        orders={[order(), order({ orderNumber: 'ORD-2026-00123', status: 'dispatched', canDownloadInvoice: true })]}
        onClearFilters={vi.fn()}
      />,
    )

    const buttons = screen.getAllByRole('button', { name: 'Download invoice' })
    expect(buttons[0]).toBeDisabled()
    expect(buttons[1]).toBeEnabled()
  })

  it('says there are no orders yet, and offers the listings', async () => {
    const router = renderWithRouter(<OrdersTable orders={[]} onClearFilters={vi.fn()} />, '/orders')

    expect(screen.getByText('No orders yet')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'View my listings' }))
    expect(router.state.location.pathname).toBe('/catalogue')
  })

  it('says nothing matches when a filter is on, and clears it', async () => {
    const onClearFilters = vi.fn()
    renderWithRouter(<OrdersTable orders={[]} filtered onClearFilters={onClearFilters} />)

    expect(screen.getByText('No orders match')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(onClearFilters).toHaveBeenCalledOnce()
  })
})
