import { describe, expect, it } from 'vitest'
import { addressLines, hasDispatched, invoiceUnavailableReason } from 'src/store/orders/selector'
import { orderDetail } from 'src/test/orderDetailFixture'

const { delivery, dispatch } = orderDetail()

describe('addressLines', () => {
  it('puts who it is for, the attention name, the street, then the suburb with state and postcode', () => {
    expect(addressLines('Mining Co Pty Ltd', delivery)).toEqual(['Mining Co Pty Ltd', 'Attn: Sarah Chen', '88 Quarry Road', 'Mount Thorley NSW 2330'])
  })

  it('leaves out an attention name that was not given, and adds a country that is not Australia', () => {
    expect(addressLines('Acme', { ...delivery, attentionName: null, country: 'New Zealand' })).toEqual(['Acme', '88 Quarry Road', 'Mount Thorley NSW 2330', 'New Zealand'])
  })
})

describe('hasDispatched', () => {
  it('is false until the supplier has given anything', () => {
    expect(hasDispatched(dispatch)).toBe(false)
  })

  it('is true once there is a dispatch time, a carrier or a tracking number', () => {
    expect(hasDispatched({ ...dispatch, dispatchedAt: '2026-06-18T02:00:00.000Z' })).toBe(true)
    expect(hasDispatched({ ...dispatch, carrierName: 'Australia Post' })).toBe(true)
    expect(hasDispatched({ ...dispatch, trackingNumber: 'AP123' })).toBe(true)
  })
})

describe('invoiceUnavailableReason', () => {
  it('says a cancelled order never gets an invoice, and any other waits for dispatch', () => {
    expect(invoiceUnavailableReason('cancelled')).toBe('A cancelled order has no invoice')
    expect(invoiceUnavailableReason('picking')).toBe('Available once the supplier dispatches the order')
  })
})
