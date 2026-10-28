import type { Tone } from 'src/components/SAToneTag'
import { ListingStatus, type LowStockProduct } from 'src/store/catalogue/types'
import { pluralise } from 'src/utils/format'

export const LISTING_STATUS_DISPLAY = {
  draft: { label: 'Draft', tone: 'default' },
  published: { label: 'Published', tone: 'success' },
  retired: { label: 'Retired', tone: 'error' },
} as const satisfies Record<ListingStatus, { label: string; tone: Tone }>

const describe = ({ name, quantity }: LowStockProduct): string =>
  quantity === 0 ? `${name} is out of stock` : `${name} is running low on stock (${pluralise(quantity, 'unit')} left)`

/** The banner above the table: one sentence for one product, a count and a list for several. Null when nothing is low. */
export const lowStockMessage = (lowStock: LowStockProduct[]): { title: string; items?: string[] } | null => {
  if (lowStock.length === 0) return null
  if (lowStock.length === 1) return { title: describe(lowStock[0]!) }
  return { title: `${lowStock.length} products need restocking`, items: lowStock.map(describe) }
}

// A price the backend accepts: above 0, at most eight digits before the point and two after (its own rule, mirrored here).
const PRICE_PATTERN = /^(?!0+(\.0+)?$)\d{1,8}(\.\d{1,2})?$/

/** Null when the text is a price the backend would take, else the reason it would not. */
export const priceProblem = (text: string): string | null =>
  PRICE_PATTERN.test(text.trim()) ? null : 'Enter a price above $0 with at most 2 decimals'

/** Retired products cannot be edited (the backend answers 409), so they only get a View link. */
export const isEditable = (status: ListingStatus): boolean => status !== ListingStatus.retired
