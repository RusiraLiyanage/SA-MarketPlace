/** The dashboard's three cards, plus the number shown on the Catalogue badge. */
export interface SupplierOverview {
  /** Shown in the sidebar header and the empty-state welcome. */
  businessName: string
  /** "New orders — requiring action": received, not yet being picked. */
  newOrders: number
  /** "Dispatched today": orders dispatched today, by the Australian Eastern calendar. */
  dispatchedToday: number
  /** "Active listings": published products. */
  activeListings: number
  /** "1 awaiting your update" and the Catalogue badge: published products at or below low-stock threshold. */
  listingsNeedingAttention: number
}

/** One row of "Orders requiring dispatch". */
export interface DispatchQueueItem {
  orderNumber: string
  /** The buyer's organisation; null if the buyer has none. */
  organisationName: string | null
  /** "Received". */
  placedAt: Date
  /** Total units across the order's lines: lines of 2 and 3 make 5. */
  itemCount: number
  /** placedAt + this seller's dispatch SLA. */
  slaDueAt: Date
  /** Whole hours until slaDueAt, rounded up; negative once overdue. */
  slaHoursLeft: number
}
