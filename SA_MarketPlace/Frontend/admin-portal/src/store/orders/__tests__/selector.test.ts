import { describe, expect, it } from 'vitest'
import { FULFILMENT_DISPLAY, paymentDisplay } from 'src/store/orders/selector'

describe('paymentDisplay', () => {
  it('says "Paid (mock)" for a paid card payment, since every payment is simulated for now', () => {
    expect(paymentDisplay({ status: 'paid', method: 'card_mock' })).toEqual({ label: 'Paid (mock)', tone: 'success' })
  })

  it('says plain "Paid" for a paid payment by another method', () => {
    expect(paymentDisplay({ status: 'paid', method: 'invoice_on_account' })).toEqual({ label: 'Paid', tone: 'success' })
  })

  it.each([
    ['pending', 'Pending', 'warning'],
    ['failed', 'Failed', 'error'],
    ['refunded', 'Refunded', 'default'],
  ] as const)('names a %s payment', (status, label, tone) => {
    expect(paymentDisplay({ status, method: 'card_mock' })).toEqual({ label, tone })
  })

  it('says so when an order has no payment, instead of leaving a blank', () => {
    expect(paymentDisplay(null)).toEqual({ label: 'No payment', tone: 'default' })
  })
})

describe('FULFILMENT_DISPLAY', () => {
  it('names every stage the backend has', () => {
    expect(Object.keys(FULFILMENT_DISPLAY).sort()).toEqual(['cancelled', 'delivered', 'dispatched', 'picking', 'received'])
    expect(FULFILMENT_DISPLAY.picking.label).toBe('Picking')
  })
})
