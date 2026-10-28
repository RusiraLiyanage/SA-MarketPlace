import { OrderStatus } from '@sa-marketplace/entities'
import {
  FULFILMENT_STAGE_ORDER_STATUSES,
  FulfilmentStage,
  toFulfilmentStage,
} from './order-fulfilment'

describe('fulfilment stages', () => {
  it.each([
    [OrderStatus.placed, FulfilmentStage.received],
    [OrderStatus.confirmed, FulfilmentStage.received],
    [OrderStatus.picking, FulfilmentStage.picking],
    [OrderStatus.dispatched, FulfilmentStage.dispatched],
    [OrderStatus.delivered, FulfilmentStage.delivered],
    [OrderStatus.cancelled, FulfilmentStage.cancelled],
  ])('maps backend %s to %s', (status, stage) => {
    expect(toFulfilmentStage(status)).toBe(stage)
  })

  it('covers every backend status exactly once, so a filter never misses or double counts an order', () => {
    const covered = Object.values(FULFILMENT_STAGE_ORDER_STATUSES).flat()

    expect([...covered].sort()).toEqual(Object.values(OrderStatus).sort())
  })

  it('agrees with the reverse mapping for every status', () => {
    for (const [stage, statuses] of Object.entries(
      FULFILMENT_STAGE_ORDER_STATUSES,
    )) {
      for (const status of statuses) {
        expect(toFulfilmentStage(status)).toBe(stage)
      }
    }
  })
})
