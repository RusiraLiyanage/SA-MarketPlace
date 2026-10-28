import type { Tone } from 'src/components/SAToneTag'
import { SellerOrderStatus, type DeliveryAddress, type OrderLine } from 'src/store/orders/types'

export const ORDER_STATUS_DISPLAY = {
  new: { label: 'New', tone: 'warning' },
  picking: { label: 'Picking', tone: 'warning' },
  dispatched: { label: 'Dispatched', tone: 'info' },
  delivered: { label: 'Delivered', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'error' },
} as const satisfies Record<SellerOrderStatus, { label: string; tone: Tone }>

export const FULFILMENT_STEPS = ['Received', 'Picking & Packing', 'Dispatched', 'Delivered'] as const

// The step an order is on. Picking is a screen step, not a stored status, so a new order is already at Picking & Packing
// (backend ADR 0036). A delivered order is past the last step, which draws every step as finished.
export const currentStep = (status: SellerOrderStatus): number => {
  switch (status) {
    case SellerOrderStatus.new:
    case SellerOrderStatus.picking:
      return 1
    case SellerOrderStatus.dispatched:
      return 2
    case SellerOrderStatus.delivered:
      return FULFILMENT_STEPS.length
    case SellerOrderStatus.cancelled:
      return 0
  }
}

/** Lines are told apart by SKU, which is unique within a seller's products. */
export const lineKey = (line: OrderLine): string => line.sku

export const allPicked = (lines: OrderLine[], picked: ReadonlySet<string>): boolean =>
  lines.length > 0 && lines.every((line) => picked.has(lineKey(line)))

/** "123 Example St, Sydney NSW 2000"; the country only when it is not Australia. */
export const formatAddress = ({ streetAddress, suburb, state, postcode, country }: DeliveryAddress): string => {
  const base = `${streetAddress}, ${suburb} ${state} ${postcode}`
  return country && country.toLowerCase() !== 'australia' ? `${base}, ${country}` : base
}
