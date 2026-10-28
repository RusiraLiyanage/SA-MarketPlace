import type { Tone } from 'src/components/SAToneTag'
import type { Overview } from 'src/store/dashboard/types'

/** A seller with no orders and no listings is new: the dashboard welcomes them instead of showing three zeros. */
export const isNewSeller = ({ newOrders, dispatchedToday, activeListings }: Overview): boolean =>
  newOrders === 0 && dispatchedToday === 0 && activeListings === 0

const HOURS_PER_DAY = 24
// Past three days a count of hours is hard to read ("868h"), so it is shown in days.
const DAYS_FROM_HOURS = 72

const span = (hours: number): string =>
  hours >= DAYS_FROM_HOURS ? `${Math.floor(hours / HOURS_PER_DAY)}d` : `${hours}h`

/**
 * The dispatch deadline as a badge. The backend only gives the hours left (negative once overdue); the colour is the
 * frontend's call: red when overdue or a day or less away, amber up to two days, plain after that.
 */
export const slaBadge = (hoursLeft: number): { label: string; tone: Tone } => {
  if (hoursLeft < 0) return { label: `Overdue by ${span(-hoursLeft)}`, tone: 'error' }
  if (hoursLeft === 0) return { label: 'Due now', tone: 'error' }
  const label = `${span(hoursLeft)} left`
  if (hoursLeft <= HOURS_PER_DAY) return { label, tone: 'error' }
  if (hoursLeft <= HOURS_PER_DAY * 2) return { label, tone: 'warning' }
  return { label, tone: 'default' }
}
