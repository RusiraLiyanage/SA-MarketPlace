import type { Tone } from 'src/components/SAToneTag'
import { SupplierStatus } from 'src/store/suppliers/types'
import { pluralise } from 'src/utils/format'

export const SUPPLIER_STATUS_DISPLAY = {
  pending_review: { label: 'Pending review', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'error' },
} as const satisfies Record<SupplierStatus, { label: string; tone: Tone }>

const DAY_MS = 24 * 60 * 60 * 1000

/** Whole days an application has waited. */
export const daysWaiting = (submittedAt: string, now: Date = new Date()): number =>
  Math.max(0, Math.floor((now.getTime() - new Date(submittedAt).getTime()) / DAY_MS))

/** "Waiting 14 days", or "Waiting less than a day" for one that came in today. */
export const waitingLabel = (submittedAt: string, now: Date = new Date()): string => {
  const days = daysWaiting(submittedAt, now)
  return days === 0 ? 'Waiting less than a day' : `Waiting ${pluralise(days, 'day')}`
}

/** The banner above the queue; null when nothing is waiting. */
export const awaitingBanner = (pending: number): string | null =>
  pending > 0 ? `${pluralise(pending, 'supplier application')} awaiting review — listings stay hidden from buyers until approved` : null

/** The categories a supplier sells in, or why there are none yet. */
export const categoriesLabel = (categories: string[]): string => (categories.length > 0 ? categories.join(', ') : 'None yet')
