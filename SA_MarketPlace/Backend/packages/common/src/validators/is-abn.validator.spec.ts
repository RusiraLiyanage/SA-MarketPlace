import { validate } from 'class-validator'
import { IsAbn, isValidAbn } from './is-abn.validator'

describe('isValidAbn', () => {
  it('accepts a real, checksum-valid ABN (Bindi MedSupply, seed.sql)', () => {
    expect(isValidAbn('51824753556')).toBe(true)
  })

  it('rejects a single altered digit', () => {
    expect(isValidAbn('51824753557')).toBe(false)
  })

  it('rejects anything that is not exactly 11 digits', () => {
    expect(isValidAbn('5182475355')).toBe(false) // 10 digits
    expect(isValidAbn('518247535567')).toBe(false) // 12 digits
    expect(isValidAbn('5182475355a')).toBe(false) // non-digit
    expect(isValidAbn('')).toBe(false)
  })
})

describe('IsAbn (class-validator decorator)', () => {
  class Target {
    @IsAbn()
    abn!: string
  }

  it('passes class-validator for a valid ABN', async () => {
    const target = new Target()
    target.abn = '51824753556'

    expect(await validate(target)).toHaveLength(0)
  })

  it('fails class-validator with a descriptive message for an invalid ABN', async () => {
    const target = new Target()
    target.abn = 'not-an-abn'

    const errors = await validate(target)
    expect(errors).toHaveLength(1)
    expect(errors[0].constraints?.isAbn).toContain(
      'valid 11-digit Australian Business Number',
    )
  })
})
