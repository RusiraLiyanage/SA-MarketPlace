import type { Tone } from 'src/components/SAToneTag'
import { FulfilmentStage, PaymentMethod, PaymentStatus, type AdminOrderDelivery, type AdminOrderDispatch, type OrderPayment } from 'src/store/orders/types'

export const FULFILMENT_DISPLAY = {
  received: { label: 'Received', tone: 'default' },
  picking: { label: 'Picking', tone: 'warning' },
  dispatched: { label: 'Dispatched', tone: 'info' },
  delivered: { label: 'Delivered', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'error' },
} as const satisfies Record<FulfilmentStage, { label: string; tone: Tone }>

const PAYMENT_DISPLAY = {
  pending: { label: 'Pending', tone: 'warning' },
  paid: { label: 'Paid', tone: 'success' },
  failed: { label: 'Failed', tone: 'error' },
  refunded: { label: 'Refunded', tone: 'default' },
} as const satisfies Record<PaymentStatus, { label: string; tone: Tone }>

/**
 * The payment tag. Every payment in this version is simulated, and a paid card payment says so ("Paid (mock)"); an order with no payment
 * row says that too, rather than leaving a blank.
 */
export const paymentDisplay = (payment: OrderPayment | null): { label: string; tone: Tone } => {
  if (!payment) return { label: 'No payment', tone: 'default' }
  const { label, tone } = PAYMENT_DISPLAY[payment.status]
  return payment.status === PaymentStatus.paid && payment.method === PaymentMethod.cardMock ? { label: 'Paid (mock)', tone } : { label, tone }
}

/** The address as lines: who it is for, the street, then the suburb with its state and postcode (and the country when it is not Australia). */
export const addressLines = (customerName: string, delivery: AdminOrderDelivery): string[] => [
  customerName,
  ...(delivery.attentionName ? [`Attn: ${delivery.attentionName}`] : []),
  delivery.streetAddress,
  `${delivery.suburb} ${delivery.state} ${delivery.postcode}`,
  ...(delivery.country && delivery.country !== 'Australia' ? [delivery.country] : []),
]

/** "Not yet dispatched" until the supplier gives a carrier or a tracking number. */
export const hasDispatched = (dispatch: AdminOrderDispatch): boolean => dispatch.dispatchedAt !== null || dispatch.carrierName !== null || dispatch.trackingNumber !== null

/** Why there is no invoice, for the button's tip: a cancelled order never gets one, any other waits for dispatch. */
export const invoiceUnavailableReason = (fulfilment: FulfilmentStage): string =>
  fulfilment === FulfilmentStage.cancelled ? 'A cancelled order has no invoice' : 'Available once the supplier dispatches the order'
