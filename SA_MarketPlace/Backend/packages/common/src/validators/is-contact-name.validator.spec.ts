import { isValidContactName } from './is-contact-name.validator'

describe('isValidContactName', () => {
  it.each([
    'Jamie Lee',
    '  Jamie   Lee  ',
    'Mary Jane van der Berg',
    `${'a'.repeat(100)} ${'b'.repeat(100)}`,
    `${'a'.repeat(49)} ${'a'.repeat(50)} ${'b'.repeat(100)}`,
  ])('accepts %p', (name) => {
    expect(isValidContactName(name)).toBe(true)
  })

  it.each([
    ['one word', 'Jamie'],
    ['blank', '   '],
    ['empty', ''],
    ['not a string', 42],
    ['undefined', undefined],
    ['a first name over 100 characters', `${'a'.repeat(101)} Lee`],
    ['a last name over 100 characters', `Jamie ${'b'.repeat(101)}`],
    [
      'a first name of several words over 100 characters',
      `${'a'.repeat(60)} ${'a'.repeat(60)} Lee`,
    ],
  ])('rejects %s', (_label, name) => {
    expect(isValidContactName(name)).toBe(false)
  })
})
