import { describe, expect, it } from 'vitest'
import { abnDigits, formatAbn } from 'src/utils/abn'

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
