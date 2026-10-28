import { joinContactName, splitContactName } from './contact-name'

describe('splitContactName', () => {
  it('splits a two-word name', () => {
    expect(splitContactName('Jamie Lee')).toEqual({
      firstName: 'Jamie',
      lastName: 'Lee',
    })
  })

  it('keeps everything before the last word as the first name', () => {
    expect(splitContactName('Jamie van der Lee')).toEqual({
      firstName: 'Jamie van der',
      lastName: 'Lee',
    })
  })

  it('ignores surrounding and repeated whitespace', () => {
    expect(splitContactName('  Jamie   Lee ')).toEqual({
      firstName: 'Jamie',
      lastName: 'Lee',
    })
  })
})

describe('joinContactName', () => {
  it('round-trips a split name', () => {
    const { firstName, lastName } = splitContactName('Jamie van der Lee')

    expect(joinContactName(firstName, lastName)).toBe('Jamie van der Lee')
  })
})
