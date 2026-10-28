import type { AdminOrderListItem } from 'src/store/orders/types'

export const order = (overrides: Partial<AdminOrderListItem> = {}): AdminOrderListItem => ({
  orderNumber: 'ORD-2026-00126',
  customerName: 'WorkSafe Pty Ltd',
  supplierName: 'Bindi MedSupply',
  placedAt: '2026-06-17T02:00:00.000Z',
  total: '234.00',
  payment: { status: 'paid', method: 'card_mock' },
  fulfilment: 'received',
  ...overrides,
})
