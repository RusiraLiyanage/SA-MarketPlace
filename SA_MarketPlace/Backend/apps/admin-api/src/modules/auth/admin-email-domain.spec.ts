import { isAllowedAdminEmail, parseEmailDomains } from './admin-email-domain'

describe('parseEmailDomains', () => {
  it.each([
    ['sampleassist.com.au', ['sampleassist.com.au']],
    [' A.com , b.COM ', ['a.com', 'b.com']],
    ['a.com,,b.com,', ['a.com', 'b.com']],
    ['', []],
    ['   ', []],
  ])('reads %p as %p', (input, expected) => {
    expect(parseEmailDomains(input)).toEqual(expected)
  })
})

describe('isAllowedAdminEmail', () => {
  const allowed = ['sampleassist.com.au', 'partner.example']

  it.each([
    'a.morgan@sampleassist.com.au',
    'A.Morgan@SampleAssist.com.au',
    '  a.morgan@sampleassist.com.au  ',
    'someone@partner.example',
    'odd"@"name@sampleassist.com.au',
  ])('allows %p', (email) => {
    expect(isAllowedAdminEmail(email, allowed)).toBe(true)
  })

  it.each([
    ['another domain', 'a@gmail.com'],
    ['a look-alike prefix', 'a@evil-sampleassist.com.au'],
    ['a look-alike suffix', 'a@sampleassist.com.au.evil.com'],
    ['a subdomain', 'a@mail.sampleassist.com.au'],
    ['the domain in the local part', 'sampleassist.com.au@gmail.com'],
    ['no @ at all', 'sampleassist.com.au'],
    ['nothing before the @', '@sampleassist.com.au'],
    ['an empty string', ''],
  ])('refuses %s', (_label, email) => {
    expect(isAllowedAdminEmail(email, allowed)).toBe(false)
  })

  it('allows nobody when no domain is configured', () => {
    expect(isAllowedAdminEmail('a@sampleassist.com.au', [])).toBe(false)
  })
})
