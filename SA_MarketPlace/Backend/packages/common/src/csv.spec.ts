import { CSV_BOM, CSV_NEWLINE, toCsvCell, toCsvRow } from './csv'

describe('toCsvCell', () => {
  it.each([
    ['plain text', 'Bindi MedSupply', 'Bindi MedSupply'],
    ['a number', 64, '64'],
    ['zero', 0, '0'],
    ['a money string', '1234.50', '1234.50'],
    ['null', null, ''],
    ['undefined', undefined, ''],
    ['an empty string', '', ''],
    ['accents, left alone', 'Café Müller', 'Café Müller'],
  ])('writes %s as is', (_label, value, expected) => {
    expect(toCsvCell(value)).toBe(expected)
  })

  it('writes a date as an ISO 8601 UTC instant', () => {
    expect(toCsvCell(new Date('2026-08-28T22:20:00Z'))).toBe(
      '2026-08-28T22:20:00.000Z',
    )
  })

  it.each([
    ['a comma', 'Smith, Jones & Co', '"Smith, Jones & Co"'],
    ['a quote, doubled', 'The "Best" Supplies', '"The ""Best"" Supplies"'],
    ['a line feed', 'Line1\nLine2', '"Line1\nLine2"'],
    ['a carriage return', 'Line1\rLine2', '"Line1\rLine2"'],
    ['all of them', 'a,"b"\r\nc', '"a,""b""\r\nc"'],
  ])('quotes a cell with %s', (_label, value, expected) => {
    expect(toCsvCell(value)).toBe(expected)
  })

  it.each([
    ['=', '=SUM(A1:A9)', "'=SUM(A1:A9)"],
    ['+', '+61 400 000 000', "'+61 400 000 000"],
    ['-', '-1+2', "'-1+2"],
    ['@', '@mention', "'@mention"],
    ['a tab', '\t=1', "'\t=1"],
    ['a carriage return', '\r=1', `'\r=1`],
  ])('defuses a formula that starts with %s', (_label, value, expected) => {
    const cell = toCsvCell(value)

    // An apostrophe, then quoted if the original held a line break.
    expect(cell.replace(/^"|"$/g, '')).toBe(expected)
    expect(cell.replace(/^"/, '').startsWith("'")).toBe(true)
  })

  it('defuses a formula that also needs quoting', () => {
    expect(toCsvCell('=HYPERLINK("http://evil","click"),x')).toBe(
      `"'=HYPERLINK(""http://evil"",""click""),x"`,
    )
  })

  it('does not touch an equals sign or dash that is not first', () => {
    expect(toCsvCell('a=b')).toBe('a=b')
    expect(toCsvCell('ORD-2026-00126')).toBe('ORD-2026-00126')
  })
})

describe('toCsvRow', () => {
  it('joins the cells with commas and ends the record with CRLF', () => {
    expect(toCsvRow(['ORD-1', 'A, B', 12.5, null])).toBe(
      `ORD-1,"A, B",12.5,${CSV_NEWLINE}`,
    )
  })

  it('writes an empty record as just the line ending', () => {
    expect(toCsvRow([])).toBe(CSV_NEWLINE)
  })
})

describe('constants', () => {
  it('uses the byte order mark and CRLF the spreadsheet readers expect', () => {
    expect(CSV_BOM).toBe('﻿')
    expect(CSV_NEWLINE).toBe('\r\n')
  })
})
