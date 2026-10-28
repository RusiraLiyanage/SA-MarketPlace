import { OrderStatus } from '@sa-marketplace/entities'

/** The fulfilment vocabulary the admin screens use; the backend keeps a single OrderStatus (CLAUDE.md §9.2). */
export enum FulfilmentStage {
  received = 'received',
  picking = 'picking',
  dispatched = 'dispatched',
  delivered = 'delivered',
  cancelled = 'cancelled',
}

/** Which backend statuses each stage covers; the seller app's buckets are built from this too. */
export const FULFILMENT_STAGE_ORDER_STATUSES: Record<
  FulfilmentStage,
  readonly OrderStatus[]
> = {
  [FulfilmentStage.received]: [OrderStatus.placed, OrderStatus.confirmed],
  [FulfilmentStage.picking]: [OrderStatus.picking],
  [FulfilmentStage.dispatched]: [OrderStatus.dispatched],
  [FulfilmentStage.delivered]: [OrderStatus.delivered],
  [FulfilmentStage.cancelled]: [OrderStatus.cancelled],
}

export const toFulfilmentStage = (status: OrderStatus): FulfilmentStage => {
  switch (status) {
    case OrderStatus.placed:
    case OrderStatus.confirmed:
      return FulfilmentStage.received
    case OrderStatus.picking:
      return FulfilmentStage.picking
    case OrderStatus.dispatched:
      return FulfilmentStage.dispatched
    case OrderStatus.delivered:
      return FulfilmentStage.delivered
    case OrderStatus.cancelled:
      return FulfilmentStage.cancelled
  }
}
