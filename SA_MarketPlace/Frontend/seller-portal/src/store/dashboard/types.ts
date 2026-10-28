/** `GET /dashboard/overview`: the three cards, and the number for the Catalogue badge. All zeros is a normal answer. */
export interface Overview {
  businessName: string
  /** Orders waiting for the seller to act on. */
  newOrders: number
  /** Orders dispatched today, in the seller's own timezone. */
  dispatchedToday: number
  /** Published products. */
  activeListings: number
  /** Published products at or below their low-stock threshold. */
  listingsNeedingAttention: number
}

/** One row of "Orders requiring dispatch". */
export interface DispatchQueueRow {
  orderNumber: string
  /** Null for a buyer with no organisation. */
  organisationName: string | null
  placedAt: string
  /** Units, summed across the order's lines. */
  itemCount: number
  slaDueAt: string
  /** Rounded up; negative once the order is overdue. */
  slaHoursLeft: number
}

export interface DispatchQueueRequest {
  page: number
  limit: number
}
