import type { Tone } from 'src/components/SAToneTag'
import type { OrderStatus, StockStatus } from 'src/types'

export const APP_NAME = 'Sample Assist Marketplace'

export const PAGE_SIZE_OPTIONS = [10, 20, 30] as const

// Values match the backend's priceRange filter.
export const PRICE_RANGES = [
  { value: 'any', label: 'Any price' },
  { value: 'under_20', label: 'Under $20' },
  { value: '20_to_50', label: '$20 - $50' },
  { value: 'over_50', label: '$50+' },
] as const

// The buyer's My Orders filter chips; the backend also has picking and cancelled.
export const ORDER_STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'placed', label: 'Placed' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'delivered', label: 'Delivered' },
] as const


export const STOCK_STATUS_DISPLAY = {
  in_stock: { label: 'In Stock', tone: 'success' },
  low_stock: { label: 'Low Stock', tone: 'warning' },
  out_of_stock: { label: 'Out of Stock', tone: 'error' },
} as const satisfies Record<StockStatus, { label: string; tone: Tone }>

// Buyers see four steps; the seller's picking step shows as Confirmed.
export const ORDER_STATUS_DISPLAY = {
  placed: { label: 'Placed', tone: 'default' },
  confirmed: { label: 'Confirmed', tone: 'info' },
  picking: { label: 'Confirmed', tone: 'info' },
  dispatched: { label: 'Dispatched', tone: 'warning' },
  delivered: { label: 'Delivered', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'error' },
} as const satisfies Record<OrderStatus, { label: string; tone: Tone }>

export type PriceRangeValue = (typeof PRICE_RANGES)[number]['value']
/** A real range, as the backend filters on; "any" means no filter. */
export type PriceRange = Exclude<PriceRangeValue, 'any'>

// The catalogue sort choices; each maps onto the backend's orderField and order.
export const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Name A-Z', orderField: 'name', order: 'ASC' },
  { value: 'name_desc', label: 'Name Z-A', orderField: 'name', order: 'DESC' },
  { value: 'price_asc', label: 'Price low-high', orderField: 'price', order: 'ASC' },
  { value: 'price_desc', label: 'Price high-low', orderField: 'price', order: 'DESC' },
  { value: 'newest', label: 'Newest', orderField: 'created_at', order: 'DESC' },
] as const

export type SortKey = (typeof SORT_OPTIONS)[number]['value']
export const DEFAULT_SORT: SortKey = 'name_asc'

// Australian states and territories, as the backend accepts them.
export const AU_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'] as const
