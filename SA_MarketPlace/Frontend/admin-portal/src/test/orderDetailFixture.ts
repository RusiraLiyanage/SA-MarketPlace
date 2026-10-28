import type { AdminOrderDetail } from 'src/store/orders/types'

export const orderDetail = (overrides: Partial<AdminOrderDetail> = {}): AdminOrderDetail => ({
  orderNumber: 'ORD-2026-00125',
  placedAt: '2026-06-17T02:00:00.000Z',
  customerName: 'Mining Co Pty Ltd',
  supplierName: 'Bindi MedSupply',
  payment: { status: 'paid', method: 'card_mock' },
  fulfilment: 'picking',
  cancellationReason: null,
  items: [
    { productName: 'Urine Collection Kit - Standard', sku: 'UCK-001', quantity: 10, lineTotal: '249.90' },
    { productName: 'Hair Follicle Test Kit', sku: 'HFT-003', quantity: 5, lineTotal: '445.00' },
    { productName: 'Chain of Custody Forms', sku: 'COC-004', quantity: 16, lineTotal: '195.10' },
  ],
  subtotal: '809.09',
  gstTotal: '80.91',
  total: '890.00',
  delivery: { attentionName: 'Sarah Chen', streetAddress: '88 Quarry Road', suburb: 'Mount Thorley', state: 'NSW', postcode: '2330', country: 'Australia', notes: null },
  dispatch: { carrierName: null, trackingNumber: null, dispatchedAt: null, estimatedDeliveryAt: null, deliveredAt: null },
  canDownloadInvoice: false,
  ...overrides,
})
