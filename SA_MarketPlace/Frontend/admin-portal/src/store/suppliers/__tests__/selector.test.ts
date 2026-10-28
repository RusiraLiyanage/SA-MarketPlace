import { describe, expect, it } from 'vitest'
import { awaitingBanner, daysWaiting, SUPPLIER_STATUS_DISPLAY, waitingLabel } from 'src/store/suppliers/selector'

const NOW = new Date('2026-08-05T02:00:00.000Z')

describe('daysWaiting', () => {
  it('counts whole days since the application was submitted', () => {
    expect(daysWaiting('2026-07-22T02:00:00.000Z', NOW)).toBe(14)
    expect(daysWaiting('2026-07-22T03:00:00.000Z', NOW)).toBe(13)
  })

  it('is 0 for one that came in today, and never negative', () => {
    expect(daysWaiting('2026-08-05T01:00:00.000Z', NOW)).toBe(0)
    expect(daysWaiting('2026-08-09T02:00:00.000Z', NOW)).toBe(0)
  })
})

describe('waitingLabel', () => {
  it.each([
    ['2026-07-22T02:00:00.000Z', 'Waiting 14 days'],
    ['2026-08-04T02:00:00.000Z', 'Waiting 1 day'],
    ['2026-08-05T01:00:00.000Z', 'Waiting less than a day'],
  ])('says it for %s', (submittedAt, label) => {
    expect(waitingLabel(submittedAt, NOW)).toBe(label)
  })
})

describe('awaitingBanner', () => {
  it('is quiet when nothing is waiting', () => {
    expect(awaitingBanner(0)).toBeNull()
  })

  it('says how many are waiting, singular or plural', () => {
    expect(awaitingBanner(1)).toBe('1 supplier application awaiting review — listings stay hidden from buyers until approved')
    expect(awaitingBanner(3)).toBe('3 supplier applications awaiting review — listings stay hidden from buyers until approved')
  })
})

describe('SUPPLIER_STATUS_DISPLAY', () => {
  it('names every status the backend has', () => {
    expect(Object.keys(SUPPLIER_STATUS_DISPLAY).sort()).toEqual(['approved', 'pending_review', 'rejected'])
    expect(SUPPLIER_STATUS_DISPLAY.pending_review.label).toBe('Pending review')
  })
})
