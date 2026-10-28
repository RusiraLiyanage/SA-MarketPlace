// CSV for downloads, to RFC 4180 plus what spreadsheets need (OWASP "CSV injection").

/** Written first so Excel reads the file as UTF-8 and keeps accents in names. */
export const CSV_BOM = String.fromCharCode(0xfeff)

/** RFC 4180 ends every record, the last one too, with CRLF. */
export const CSV_NEWLINE = '\r\n'

// A cell starting with one of these is read as a formula by Excel, Sheets and LibreOffice.
const FORMULA_START = /^[=+\-@\t\r]/

/**
 * One cell as text. Text a spreadsheet would run as a formula (a customer named "=HYPERLINK(...)")
 * gets a leading apostrophe, which it shows as plain text. Quotes are doubled, and the cell is wrapped
 * in quotes when it holds a comma, a quote or a line break.
 */
export const toCsvCell = (
  value: string | number | Date | null | undefined,
): string => {
  if (value === null || value === undefined) {
    return ''
  }
  const text = value instanceof Date ? value.toISOString() : String(value)
  const safe = FORMULA_START.test(text) ? `'${text}` : text
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/** One record, with its line ending. */
export const toCsvRow = (
  values: readonly (string | number | Date | null | undefined)[],
): string => values.map(toCsvCell).join(',') + CSV_NEWLINE
