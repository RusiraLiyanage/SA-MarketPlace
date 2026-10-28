import * as moment from 'moment-timezone'
import { DEFAULT_TIMEZONE } from '../app.constant'

export const numberToString = (
  number: number | undefined,
  decimal?: number,
): string => {
  const decimalValue = decimal ?? 0
  const numberValue = Number(number)

  return !isNaN(numberValue) ? numberValue.toFixed(decimalValue) : ''
}

export const convertTzStringToDateTime = (
  dateTime: Date | string | null | undefined,
  timezone: string | null = DEFAULT_TIMEZONE,
  formatter = 'DD/MM/YYYY',
): string => {
  try {
    // Early return for null/undefined
    if (!dateTime) return ''

    let momentDate: moment.Moment

    if (dateTime instanceof Date) {
      // Handle Date object from DB
      if (isNaN(dateTime.getTime())) {
        console.log('Invalid Date object:', dateTime)
        return ''
      }
      // Date objects from DB are already in UTC
      momentDate = moment.utc(dateTime)
    } else if (typeof dateTime === 'string') {
      // Handle string input
      if (!dateTime.trim()) return ''

      // Parse UTC string (like "2025-09-03T08:57:59.927Z")
      momentDate = moment.utc(dateTime)

      if (!momentDate.isValid()) {
        console.log('Invalid date string:', dateTime)
        return ''
      }
    } else {
      console.log('Invalid dateTime type:', typeof dateTime, dateTime)
      return ''
    }

    // Apply timezone conversion if specified
    if (timezone) {
      momentDate = momentDate.tz(timezone)
    }

    return momentDate.format(formatter)
  } catch (error) {
    console.log('Error formatting date:', dateTime, error)
    return ''
  }
}

export const convertTzDateTime = (
  dateTime: Date | null | undefined,
  timezone: string | null = DEFAULT_TIMEZONE,
  formatter = 'DD/MM/YYYY',
): string => {
  if (!(dateTime instanceof Date) || isNaN(dateTime.getTime())) return ''

  // UTC, not local time, so the result never depends on the server's timezone.
  let momentDate = moment.utc(dateTime)

  if (timezone) {
    if (!moment.tz.zone(timezone)) return ''
    momentDate = momentDate.tz(timezone)
  }

  return momentDate.format(formatter)
}
