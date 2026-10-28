import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OrderFulfilmentPage from 'src/pages/OrderFulfilment'
import { useGetOrderQuery } from 'src/store/orders/actions'
import type { OrderDetail } from 'src/store/orders/types'
import { renderWithRouter } from 'src/test/renderWithRouter'

vi.mock('src/store/orders/actions', () => ({
  useGetOrderQuery: vi.fn(),
  useDispatchOrderMutation: () => [vi.fn(), { isLoading: false }],
  useDownloadInvoiceMutation: () => [vi.fn(), { isLoading: false }],
}))

const detail = (overrides: Partial<OrderDetail> = {}): OrderDetail => ({
  orderNumber: 'ORD-2026-00126',
  placedAt: '2026-06-17T02:00:00.000Z',
  status: 'new',
  cancellationReason: null,
  organisationName: 'WorkSafe Pty Ltd',
  items: [
    { productName: 'Urine Collection Kit', sku: 'UCK-001', quantity: 2 },
    { productName: 'Oral Fluid Rapid Test', sku: 'OFT-002', quantity: 1 },
    { productName: 'CoC Forms', sku: 'COC-004', quantity: 1 },
  ],
  delivery: { attentionName: 'Dana', streetAddress: '123 Example St', suburb: 'Sydney', state: 'NSW', postcode: '2000', country: 'Australia', notes: null },
  dispatch: { carrierName: null, trackingNumber: null, dispatchedAt: null, estimatedDeliveryAt: null, deliveredAt: null, defaultCarrier: 'Australia Post' },
  canDispatch: true,
  canDownloadInvoice: false,
  ...overrides,
})

const show = (state: Partial<{ data: OrderDetail; error: unknown; isLoading: boolean }>) => {
  vi.mocked(useGetOrderQuery).mockReturnValue({ refetch: vi.fn(), ...state } as unknown as ReturnType<typeof useGetOrderQuery>)
  return renderWithRouter(<div />, '/orders/ORD-2026-00126', [{ path: '/orders/:orderNumber', element: <OrderFulfilmentPage /> }])
}

describe('OrderFulfilmentPage', () => {
  beforeEach(() => vi.mocked(useGetOrderQuery).mockReset())

  it('shows the order, who placed it and where it goes', () => {
    show({ data: detail() })

    expect(screen.getByRole('heading', { level: 1, name: 'Order ORD-2026-00126' })).toBeInTheDocument()
    expect(screen.getByText('Placed 17 Jun 2026 by WorkSafe Pty Ltd')).toBeInTheDocument()
    expect(screen.getByText('123 Example St, Sydney NSW 2000')).toBeInTheDocument()
    expect(screen.getByText('Attention: Dana')).toBeInTheDocument()
  })

  it('gets Confirm dispatch going only once every line is ticked, with Mark all picked as the shortcut', async () => {
    show({ data: detail() })
    const confirm = screen.getByRole('button', { name: 'Confirm dispatch' })
    expect(confirm).toBeDisabled()

    await userEvent.click(screen.getByRole('checkbox', { name: /Urine Collection Kit/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Oral Fluid Rapid Test/ }))
    expect(screen.getByText('2 of 3 picked')).toBeInTheDocument()
    expect(confirm).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Mark all picked' }))
    expect(screen.getByText('All items picked — ready to dispatch')).toBeInTheDocument()
    expect(confirm).toBeEnabled()
  })

  it('lets a tick be taken back', async () => {
    show({ data: detail() })

    await userEvent.click(screen.getByRole('button', { name: 'Mark all picked' }))
    await userEvent.click(screen.getByRole('checkbox', { name: /CoC Forms/ }))

    expect(screen.getByText('2 of 3 picked')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm dispatch' })).toBeDisabled()
  })

  it('turns Download invoice off before dispatch', () => {
    show({ data: detail() })
    expect(screen.getByRole('button', { name: 'Download invoice' })).toBeDisabled()
  })

  it('turns Download invoice on once it has dispatched, and shows the lines as picked', () => {
    show({ data: detail({ status: 'dispatched', canDispatch: false, canDownloadInvoice: true }) })

    expect(screen.getByRole('button', { name: 'Download invoice' })).toBeEnabled()
    for (const box of screen.getAllByRole('checkbox')) expect(box).toBeChecked()
  })

  it('shows a cancelled order with its reason and nothing to dispatch', () => {
    show({ data: detail({ status: 'cancelled', canDispatch: false, cancellationReason: 'Out of stock' }) })

    expect(screen.getByText('Out of stock')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm dispatch' })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('says so when the order does not exist or belongs to another seller', () => {
    show({ error: { status: 404, code: 'ECB404', message: 'Order not found' } })
    expect(screen.getByText('Order not found')).toBeInTheDocument()
  })

  it('offers another try when the order cannot be loaded', () => {
    show({ error: { status: 0, code: 'NETWORK', message: 'Cannot reach the server.' } })
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('shows a loading outline', () => {
    show({ isLoading: true })
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
  })
})
