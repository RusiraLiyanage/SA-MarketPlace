import { describe, expect, it } from 'vitest'
import { isNewSeller, slaBadge } from 'src/store/dashboard/selector'
import type { Overview } from 'src/store/dashboard/types'

const overview = (overrides: Partial<Overview> = {}): Overview => ({
  businessName: 'Bindi MedSupply Pty Ltd',
  newOrders: 0,
  dispatchedToday: 0,
  activeListings: 0,
  listingsNeedingAttention: 0,
  ...overrides,
})

describe('isNewSeller', () => {
  it('is true when there are no orders and no listings', () => {
    expect(isNewSeller(overview())).toBe(true)
  })

  it.each([{ newOrders: 1 }, { dispatchedToday: 1 }, { activeListings: 1 }])('is false once there is anything: %o', (change) => {
    expect(isNewSeller(overview(change))).toBe(false)
  })
})

describe('slaBadge', () => {
  it('is red and says how late an overdue order is', () => {
    expect(slaBadge(-12)).toEqual({ label: 'Overdue by 12h', tone: 'error' })
  })

  it('shows a long overdue time in days, not hours', () => {
    expect(slaBadge(-868)).toEqual({ label: 'Overdue by 36d', tone: 'error' })
  })

  it('is red and "Due now" at exactly zero', () => {
    expect(slaBadge(0)).toEqual({ label: 'Due now', tone: 'error' })
  })

  it('is red up to a day left, amber up to two days, plain after', () => {
    expect(slaBadge(1)).toEqual({ label: '1h left', tone: 'error' })
    expect(slaBadge(24)).toEqual({ label: '24h left', tone: 'error' })
    expect(slaBadge(25)).toEqual({ label: '25h left', tone: 'warning' })
    expect(slaBadge(48)).toEqual({ label: '48h left', tone: 'warning' })
    expect(slaBadge(49)).toEqual({ label: '49h left', tone: 'default' })
  })

  it('switches to days from three days, rounding down', () => {
    expect(slaBadge(71)).toEqual({ label: '71h left', tone: 'default' })
    expect(slaBadge(72)).toEqual({ label: '3d left', tone: 'default' })
    expect(slaBadge(100)).toEqual({ label: '4d left', tone: 'default' })
  })
})
