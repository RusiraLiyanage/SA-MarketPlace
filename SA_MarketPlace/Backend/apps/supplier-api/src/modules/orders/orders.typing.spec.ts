import { OrderStatus } from '@sa-marketplace/entities'
import {
  AWAITING_DISPATCH_STATUSES,
  NEW_ORDER_STATUSES,
  SELLER_STATUS_TO_ORDER_STATUSES,
  SellerOrderStatus,
  toSellerStatus,
} from './orders.typing'

describe('seller order statuses', () => {
  it.each([
    [OrderStatus.placed, SellerOrderStatus.new],
    [OrderStatus.confirmed, SellerOrderStatus.new],
    [OrderStatus.picking, SellerOrderStatus.picking],
    [OrderStatus.dispatched, SellerOrderStatus.dispatched],
    [OrderStatus.delivered, SellerOrderStatus.delivered],
    [OrderStatus.cancelled, SellerOrderStatus.cancelled],
  ])('maps backend %s to seller %s', (backend, seller) => {
    expect(toSellerStatus(backend)).toBe(seller)
  })

  it('covers every backend status exactly once, so a filter never misses or double counts an order', () => {
    const covered = Object.values(SELLER_STATUS_TO_ORDER_STATUSES).flat()

    expect([...covered].sort()).toEqual(Object.values(OrderStatus).sort())
  })

  it('agrees with the reverse mapping for every status', () => {
    for (const [seller, backends] of Object.entries(
      SELLER_STATUS_TO_ORDER_STATUSES,
    )) {
      for (const backend of backends) {
        expect(toSellerStatus(backend)).toBe(seller)
      }
    }
  })

  it('defines new as placed and confirmed, and awaiting dispatch as new plus picking', () => {
    expect([...NEW_ORDER_STATUSES]).toEqual([
      OrderStatus.placed,
      OrderStatus.confirmed,
    ])
    expect([...AWAITING_DISPATCH_STATUSES]).toEqual([
      OrderStatus.placed,
      OrderStatus.confirmed,
      OrderStatus.picking,
    ])
  })
})
