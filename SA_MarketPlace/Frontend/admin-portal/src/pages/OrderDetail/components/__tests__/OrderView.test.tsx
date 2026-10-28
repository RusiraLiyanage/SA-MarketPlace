import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import OrderView from 'src/pages/OrderDetail/components/OrderView'
import { orderDetail } from 'src/test/orderDetailFixture'
import { renderWithRouter } from 'src/test/renderWithRouter'
import type { AdminOrderDetail } from 'src/store/orders/types'

vi.mock('src/store/orders/actions', () => ({
  useDownloadInvoiceMutation: () => [vi.fn(), { isLoading: false }],
}))

const show = (overrides: Partial<AdminOrderDetail> = {}) => renderWithRouter(<OrderView order={orderDetail(overrides)} />, '/orders/ORD-2026-00125')

describe('OrderView', () => {
  it('names the order and says it is read-only', () => {
    show()

    expect(screen.getByRole('heading', { level: 1, name: 'Order ORD-2026-00125' })).toBeInTheDocument()
    expect(screen.getByText('Read-only — fulfilment is managed by the supplier, not Sample Assist')).toBeInTheDocument()
  })

  it('shows the customer, supplier, payment, fulfilment and date placed', () => {
    show()

    const summary = within(screen.getByLabelText('Order summary'))
    expect(summary.getByText('Mining Co Pty Ltd')).toBeInTheDocument()
    expect(summary.getByText('Bindi MedSupply')).toBeInTheDocument()
    expect(summary.getByText('Paid (mock)')).toBeInTheDocument()
    expect(summary.getByText('Picking')).toBeInTheDocument()
    expect(summary.getByText('17 Jun 2026')).toBeInTheDocument()
  })

  it('lists the items with their SKU, quantity and line total, then the total with its GST', () => {
    show()

    const items = within(screen.getByRole('region', { name: 'Items ordered' }))
    expect(items.getByText('Urine Collection Kit - Standard')).toBeInTheDocument()
    expect(items.getByText('SKU: UCK-001')).toBeInTheDocument()
    expect(items.getByText('×10 $249.90')).toBeInTheDocument()
    expect(items.getByText('×16 $195.10')).toBeInTheDocument()
    expect(items.getByText('Total (GST incl.)')).toBeInTheDocument()
    expect(items.getByText('$890.00')).toBeInTheDocument()
    expect(items.getByText('Includes $80.91 GST')).toBeInTheDocument()
  })

  it('shows the delivery address and says "Not yet dispatched" before the supplier has sent it', () => {
    show()

    const delivery = within(screen.getByRole('region', { name: 'Delivery & tracking' }))
    expect(delivery.getByText('Attn: Sarah Chen')).toBeInTheDocument()
    expect(delivery.getByText('88 Quarry Road')).toBeInTheDocument()
    expect(delivery.getByText('Mount Thorley NSW 2330')).toBeInTheDocument()
    expect(delivery.getByText('Not yet dispatched')).toBeInTheDocument()
  })

  it('shows the carrier, tracking number and dates once it is dispatched', () => {
    show({
      fulfilment: 'dispatched',
      canDownloadInvoice: true,
      dispatch: { carrierName: 'Australia Post', trackingNumber: 'AP1234567', dispatchedAt: '2026-06-18T02:00:00.000Z', estimatedDeliveryAt: '2026-06-22T02:00:00.000Z', deliveredAt: null },
    })

    const delivery = within(screen.getByRole('region', { name: 'Delivery & tracking' }))
    expect(delivery.getByText('Australia Post · AP1234567')).toBeInTheDocument()
    expect(delivery.getByText('Dispatched 18 Jun 2026')).toBeInTheDocument()
    expect(delivery.getByText('Estimated delivery 22 Jun 2026')).toBeInTheDocument()
    expect(delivery.queryByText(/^Delivered/)).not.toBeInTheDocument()
  })

  it('shows delivery notes when the buyer left some', () => {
    show({ delivery: { ...orderDetail().delivery, notes: 'Leave with reception' } })

    expect(screen.getByText('Leave with reception')).toBeInTheDocument()
  })

  it('has the invoice off until the order is dispatched', () => {
    show()

    expect(screen.getByRole('button', { name: 'Download invoice' })).toBeDisabled()
  })

  it('has the invoice on once the order is delivered', () => {
    show({ fulfilment: 'delivered', canDownloadInvoice: true })

    expect(screen.getByRole('button', { name: 'Download invoice' })).toBeEnabled()
  })

  it('says a cancelled order was cancelled, and why', () => {
    show({ fulfilment: 'cancelled', cancellationReason: 'Out of stock' })

    expect(screen.getByText('This order was cancelled')).toBeInTheDocument()
    expect(screen.getByText('Out of stock')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download invoice' })).toBeDisabled()
  })

  it('says nothing about a cancellation for an order that was not cancelled', () => {
    show()

    expect(screen.queryByText('This order was cancelled')).not.toBeInTheDocument()
  })
})
