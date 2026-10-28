/** Every date shown to a user in this project is Australian Eastern time. */
export const DEFAULT_TIMEZONE = 'Australia/Sydney'

export type DateStyle = 'date' | 'dateTime' | 'time'

export interface FormatDateOptions {
  /** IANA timezone, e.g. 'Australia/Sydney'. */
  timeZone?: string
  /** 'date' → 01/09/2026, 'dateTime' → 01/09/2026, 14:30, 'time' → 14:30. */
  style?: DateStyle
}

const STYLE_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  date: { day: '2-digit', month: '2-digit', year: 'numeric' },
  dateTime: {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  },
  time: { hour: '2-digit', minute: '2-digit', hour12: false },
}

const toDate = (value: Date | string | null | undefined): Date | null => {
  if (!value) {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

export const formatDate = (
  value: Date | string | null | undefined,
  options: FormatDateOptions = {},
): string => {
  const date = toDate(value)

  if (!date) {
    return ''
  }

  const { timeZone = DEFAULT_TIMEZONE, style = 'date' } = options

  try {
    return new Intl.DateTimeFormat('en-AU', {
      ...STYLE_OPTIONS[style],
      timeZone,
    }).format(date)
  } catch {
    // Intl throws RangeError on an unknown timezone.
    return ''
  }
}
