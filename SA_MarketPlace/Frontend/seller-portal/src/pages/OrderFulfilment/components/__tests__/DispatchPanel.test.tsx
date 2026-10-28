import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DispatchPanel from 'src/pages/OrderFulfilment/components/DispatchPanel'
import type { OrderDetail } from 'src/store/orders/types'
import { renderWithRouter } from 'src/test/renderWithRouter'

const dispatchOrder = vi.fn()
// What the backend refuses with, when a test wants it to. A plain function returns the rejection, so a mock does not
// record (and re-throw) it.
const backend = vi.hoisted(() => ({ refusal: undefined as unknown }))
vi.mock('src/store/orders/actions', () => ({
  useDispatchOrderMutation: () => [
    (arg: unknown) => ({ unwrap: () => (backend.refusal ? Promise.reject(backend.refusal) : dispatchOrder(arg)) }),
    { isLoading: false },
  ],
}))

const order = (overrides: Partial<OrderDetail> = {}): OrderDetail => ({
  orderNumber: 'ORD-2026-00126',
  placedAt: '2026-06-17T02:00:00.000Z',
  status: 'new',
  cancellationReason: null,
  organisationName: 'WorkSafe Pty Ltd',
  items: [
    { productName: 'Urine Collection Kit', sku: 'UCK-001', quantity: 2 },
    { productName: 'Oral Fluid Rapid Test', sku: 'OFT-002', quantity: 1 },
  ],
  delivery: { attentionName: null, streetAddress: '123 Example St', suburb: 'Sydney', state: 'NSW', postcode: '2000', country: 'Australia', notes: null },
  dispatch: { carrierName: null, trackingNumber: null, dispatchedAt: null, estimatedDeliveryAt: null, deliveredAt: null, defaultCarrier: 'Australia Post' },
  canDispatch: true,
  canDownloadInvoice: false,
  ...overrides,
})

describe('DispatchPanel', () => {
  beforeEach(() => {
    dispatchOrder.mockReset()
    backend.refusal = undefined
  })

  it('keeps Confirm dispatch off, and says why right above it, until every line is picked', () => {
    renderWithRouter(<DispatchPanel order={order()} pickedCount={1} />)

    expect(screen.getByText('Mark all items as picked to enable dispatch')).toBeInTheDocument()
    expect(screen.getByText('1 of 2 picked')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm dispatch' })).toBeDisabled()
  })

  it('turns the warning into a confirmation, and the button on, when everything is picked', () => {
    renderWithRouter(<DispatchPanel order={order()} pickedCount={2} />)

    expect(screen.getByText('All items picked — ready to dispatch')).toBeInTheDocument()
    expect(screen.queryByText('Mark all items as picked to enable dispatch')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm dispatch' })).toBeEnabled()
  })

  it('starts the carrier from the seller\'s default, and asks only for a carrier and a tracking number (the server sets the dates)', () => {
    renderWithRouter(<DispatchPanel order={order()} pickedCount={2} />)

    expect(screen.getByLabelText(/^Carrier name/)).toHaveValue('Australia Post')
    expect(screen.getByLabelText(/^Tracking number/)).toHaveValue('')
    expect(screen.queryByLabelText(/date/i)).not.toBeInTheDocument()
  })

  it('needs a tracking number before it can be sent', async () => {
    renderWithRouter(<DispatchPanel order={order()} pickedCount={2} />)

    await userEvent.click(screen.getByRole('button', { name: 'Confirm dispatch' }))

    expect(await screen.findByText('Enter the tracking number')).toBeInTheDocument()
    expect(dispatchOrder).not.toHaveBeenCalled()
  })

  it('sends the carrier and tracking number, trimmed', async () => {
    dispatchOrder.mockResolvedValue({})
    renderWithRouter(<DispatchPanel order={order()} pickedCount={2} />)

    const carrier = screen.getByLabelText(/^Carrier name/)
    await userEvent.clear(carrier)
    await userEvent.type(carrier, '  Sendle ')
    await userEvent.type(screen.getByLabelText(/^Tracking number/), ' AP123456789 ')
    await userEvent.click(screen.getByRole('button', { name: 'Confirm dispatch' }))

    await vi.waitFor(() =>
      expect(dispatchOrder).toHaveBeenCalledWith({ orderNumber: 'ORD-2026-00126', carrierName: 'Sendle', trackingNumber: 'AP123456789' }),
    )
  })

  it('shows the backend\'s reason when dispatch is refused', async () => {
    backend.refusal = { status: 409, code: 'ECB409', message: 'This order is no longer waiting for dispatch' }
    renderWithRouter(<DispatchPanel order={order()} pickedCount={2} />)

    await userEvent.type(screen.getByLabelText(/^Tracking number/), 'AP1')
    await userEvent.click(screen.getByRole('button', { name: 'Confirm dispatch' }))

    expect(await screen.findByText('This order is no longer waiting for dispatch')).toBeInTheDocument()
  })

  it('opens the cancel pop-up from "Cannot fulfil this order"', async () => {
    const router = renderWithRouter(<DispatchPanel order={order()} pickedCount={0} />, '/orders/ORD-2026-00126')

    await userEvent.click(screen.getByRole('button', { name: 'Cannot fulfil this order' }))

    expect(router.state.location.pathname).toBe('/orders/ORD-2026-00126/cancel')
  })

  it('shows what was recorded once the order has gone out, with no form', () => {
    renderWithRouter(
      <DispatchPanel
        pickedCount={0}
        order={order({
          status: 'dispatched',
          canDispatch: false,
          dispatch: {
            carrierName: 'Australia Post',
            trackingNumber: 'AP123456789',
            dispatchedAt: '2026-06-18T02:00:00.000Z',
            estimatedDeliveryAt: '2026-06-21T02:00:00.000Z',
            deliveredAt: null,
            defaultCarrier: 'Australia Post',
          },
        })}
      />,
    )

    expect(screen.getByText('Australia Post')).toBeInTheDocument()
    expect(screen.getByText('AP123456789')).toBeInTheDocument()
    expect(screen.getByText('18 Jun 2026')).toBeInTheDocument()
    expect(screen.getByText('21 Jun 2026')).toBeInTheDocument()
    expect(screen.queryByText('Delivered')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm dispatch' })).not.toBeInTheDocument()
  })

  it('is not drawn for a cancelled order', () => {
    renderWithRouter(<DispatchPanel order={order({ status: 'cancelled', canDispatch: false })} pickedCount={0} />)
    expect(screen.queryByText('Dispatch details')).not.toBeInTheDocument()
  })
})
