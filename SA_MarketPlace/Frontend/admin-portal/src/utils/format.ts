const currency = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' })

// Prices arrive as strings (the backend keeps money exact); they are only turned into a number to display.
export const formatCurrency = (amount: string | number): string => currency.format(Number(amount))

const dateParts = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  timeZone: 'Australia/Sydney',
})

// Locale data spells some months out ("July"), so the abbreviations are fixed to match the designs.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "25 Jul 2026". Times are UTC instants from the API, shown in Sydney time.
export const formatDate = (iso: string): string => {
  const part = (type: string) => dateParts.formatToParts(new Date(iso)).find((p) => p.type === type)!.value
  return `${part('day')} ${MONTHS[Number(part('month')) - 1]} ${part('year')}`
}

// "Jan 2026": when someone became a member.
export const formatMonthYear = (iso: string): string => {
  const part = (type: string) => dateParts.formatToParts(new Date(iso)).find((p) => p.type === type)!.value
  return `${MONTHS[Number(part('month')) - 1]} ${part('year')}`
}

const timeParts = new Intl.DateTimeFormat('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Australia/Sydney' })

// The Sydney calendar day of a moment, to tell today from yesterday without a clock-time boundary in the middle of the evening.
const dayOf = (date: Date): string => {
  const part = (type: string) => dateParts.formatToParts(date).find((p) => p.type === type)!.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

// "Today, 9:14 AM", "Yesterday, 4:02 PM", or "25 Oct 2026, 9:14 AM". Times are UTC instants from the API, shown in Sydney time.
export const formatWhen = (iso: string, now: Date = new Date()): string => {
  const moment = new Date(iso)
  const time = timeParts.format(moment).toUpperCase()
  if (dayOf(moment) === dayOf(now)) return `Today, ${time}`
  if (dayOf(moment) === dayOf(new Date(now.getTime() - 24 * 60 * 60 * 1000))) return `Yesterday, ${time}`
  return `${formatDate(iso)}, ${time}`
}

export const initials = (firstName: string, lastName: string): string =>
  `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()

export const pluralise = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`
