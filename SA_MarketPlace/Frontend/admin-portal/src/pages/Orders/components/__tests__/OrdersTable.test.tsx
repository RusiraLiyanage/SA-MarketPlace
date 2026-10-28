import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import OrdersTable from 'src/pages/Orders/components/OrdersTable'
import { order } from 'src/test/orderFixture'
import { renderWithRouter } from 'src/test/renderWithRouter'
import type { AdminOrderListItem } from 'src/store/orders/types'

const show = (orders: AdminOrderListItem[], props: Partial<Parameters<typeof OrdersTable>[0]> = {}) =>
  renderWithRouter(
    <OrdersTable orders={orders} sortField="placed_at" sortOrder="DESC" onSortChange={vi.fn()} onClearFilters={vi.fn()} {...props} />,
    '/orders',
  )

describe('OrdersTable', () => {
  it('shows each order with its customer, supplier, date, value and the two tags', () => {
    show([order()])

    expect(screen.getByRole('link', { name: 'ORD-2026-00126' })).toHaveAttribute('href', '/orders/ORD-2026-00126')
    expect(screen.getByText('WorkSafe Pty Ltd')).toBeInTheDocument()
    expect(screen.getByText('Bindi MedSupply')).toBeInTheDocument()
    expect(screen.getByText('17 Jun 2026')).toBeInTheDocument()
    expect(screen.getByText('$234.00')).toBeInTheDocument()
    expect(screen.getByText('Paid (mock)')).toBeInTheDocument()
    expect(screen.getByText('Received')).toBeInTheDocument()
  })

  it('shows every fulfilment stage and payment state in words', () => {
    show([
      order({ orderNumber: 'ORD-2026-00125', payment: { status: 'pending', method: 'invoice_on_account' }, fulfilment: 'picking' }),
      order({ orderNumber: 'ORD-2026-00124', payment: { status: 'refunded', method: 'card_mock' }, fulfilment: 'cancelled' }),
      order({ orderNumber: 'ORD-2026-00123', payment: null, fulfilment: 'delivered' }),
      order({ orderNumber: 'ORD-2026-00122', fulfilment: 'dispatched' }),
    ])

    for (const text of ['Pending', 'Picking', 'Refunded', 'Cancelled', 'No payment', 'Delivered', 'Dispatched']) {
      expect(screen.getByText(text)).toBeInTheDocument()
    }
  })

  it('opens an order from View', async () => {
    const router = show([order()])

    await userEvent.click(screen.getByRole('link', { name: 'View ORD-2026-00126' }))

    expect(router.state.location.pathname).toBe('/orders/ORD-2026-00126')
  })

  it('reports the column pressed to sort by, in the backend\'s own name', async () => {
    const onSortChange = vi.fn()
    show([order()], { onSortChange })

    await userEvent.click(screen.getByText('VALUE'))

    expect(onSortChange).toHaveBeenCalledWith({ orderField: 'total', order: 'ASC' })
  })

  it('reports no sort when a column is pressed through to the end', async () => {
    const onSortChange = vi.fn()
    show([order()], { sortField: 'total', sortOrder: 'DESC', onSortChange })

    await userEvent.click(screen.getByText('VALUE'))

    expect(onSortChange).toHaveBeenCalledWith({})
  })

  it('says there are no orders yet, and what will appear', () => {
    show([])

    expect(screen.getByText('No orders yet')).toBeInTheDocument()
    expect(screen.getByText('Every marketplace and Collection Manager order will appear here with its payment and fulfilment status.')).toBeInTheDocument()
  })

  it('says nothing matches when a filter is on, and clears it', async () => {
    const onClearFilters = vi.fn()
    show([], { filtered: true, onClearFilters })

    expect(screen.getByText('No orders match')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

    expect(onClearFilters).toHaveBeenCalledOnce()
  })
})
