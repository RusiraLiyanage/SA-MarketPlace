/** Postgres type: order_status. Single source of truth for order state (§7); UIs map their own labels. */
export enum OrderStatus {
  placed = 'placed',
  confirmed = 'confirmed',
  picking = 'picking',
  dispatched = 'dispatched',
  delivered = 'delivered',
  cancelled = 'cancelled',
}
