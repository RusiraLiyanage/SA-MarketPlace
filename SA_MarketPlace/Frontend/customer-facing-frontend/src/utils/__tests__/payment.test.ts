import { describe, expect, it } from 'vitest'
import { describePayment } from 'src/utils/payment'

describe('describePayment', () => {
  it('names the card and its last four digits', () => {
    expect(describePayment({ method: 'card_mock', cardLast4: '3456' })).toBe('Credit card (mock, ending 3456)')
  })

  it('names invoice on account without a card', () => {
    expect(describePayment({ method: 'invoice_on_account', cardLast4: null })).toBe('Invoice on account')
  })
})
