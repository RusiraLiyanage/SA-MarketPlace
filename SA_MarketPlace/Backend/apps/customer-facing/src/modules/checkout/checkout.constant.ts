// Australian states and territories, for the delivery form.
export const AU_STATES = [
  'NSW',
  'VIC',
  'QLD',
  'SA',
  'WA',
  'TAS',
  'NT',
  'ACT',
] as const

// Mock gateway test cards (CLAUDE.md §4.6): checkout is mocked, no real money moves.
export const MOCK_CARD_APPROVED = '4242424242424242'
export const MOCK_CARD_DECLINED = '4000000000000002'
