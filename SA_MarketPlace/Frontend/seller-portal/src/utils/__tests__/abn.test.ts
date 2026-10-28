import { describe, expect, it } from 'vitest'
import { abnDigits, formatAbn, isValidAbn } from 'src/utils/abn'

describe('abnDigits', () => {
  it('keeps only the digits', () => {
    expect(abnDigits('51 824 753 556')).toBe('51824753556')
    expect(abnDigits(' 51-824.753/556 ')).toBe('51824753556')
  })
})

describe('formatAbn', () => {
  it('groups the digits as typed', () => {
    expect(formatAbn('5')).toBe('5')
    expect(formatAbn('51')).toBe('51')
    expect(formatAbn('518')).toBe('51 8')
    expect(formatAbn('51824753556')).toBe('51 824 753 556')
  })

  it('drops letters and anything past eleven digits', () => {
    expect(formatAbn('51a824 753 556 999')).toBe('51 824 753 556')
  })
})

describe('isValidAbn', () => {
  it('accepts the seeded supplier numbers, spaced or not', () => {
    expect(isValidAbn('51824753556')).toBe(true)
    expect(isValidAbn('51 824 753 556')).toBe(true)
  })

  it('rejects a wrong checksum', () => {
    expect(isValidAbn('51824753557')).toBe(false)
  })

  it('rejects a number that is not eleven digits', () => {
    expect(isValidAbn('')).toBe(false)
    expect(isValidAbn('5182475355')).toBe(false)
    expect(isValidAbn('518247535560')).toBe(false)
  })
})
