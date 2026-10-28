import { describe, expect, it } from 'vitest'
import { allPicked, currentStep, formatAddress, lineKey } from 'src/store/orders/selector'
import { SellerOrderStatus, type DeliveryAddress, type OrderLine } from 'src/store/orders/types'

const line = (sku: string): OrderLine => ({ productName: `Product ${sku}`, sku, quantity: 1 })

describe('currentStep', () => {
  it('puts a new order at Picking & Packing, because picking is a screen step and not a stored status', () => {
    expect(currentStep(SellerOrderStatus.new)).toBe(1)
    expect(currentStep(SellerOrderStatus.picking)).toBe(1)
  })

  it('moves on to Dispatched, and past the last step once delivered so every step is finished', () => {
    expect(currentStep(SellerOrderStatus.dispatched)).toBe(2)
    expect(currentStep(SellerOrderStatus.delivered)).toBe(4)
  })
})

describe('allPicked', () => {
  const lines = [line('A'), line('B')]

  it('is true only when every line is ticked', () => {
    expect(allPicked(lines, new Set(['A']))).toBe(false)
    expect(allPicked(lines, new Set(['A', 'B']))).toBe(true)
  })

  it('is false for an order with no lines, so nothing can be dispatched empty', () => {
    expect(allPicked([], new Set())).toBe(false)
  })

  it('tells lines apart by SKU', () => {
    expect(lineKey(line('HFT-003'))).toBe('HFT-003')
  })
})

describe('formatAddress', () => {
  const address: DeliveryAddress = {
    attentionName: null,
    streetAddress: '123 Example St',
    suburb: 'Sydney',
    state: 'NSW',
    postcode: '2000',
    country: 'Australia',
    notes: null,
  }

  it('joins the parts on one line', () => {
    expect(formatAddress(address)).toBe('123 Example St, Sydney NSW 2000')
  })

  it('adds the country only when it is not Australia', () => {
    expect(formatAddress({ ...address, country: 'New Zealand' })).toBe('123 Example St, Sydney NSW 2000, New Zealand')
  })
})
