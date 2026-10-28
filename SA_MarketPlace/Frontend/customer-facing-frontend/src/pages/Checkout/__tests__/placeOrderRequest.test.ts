import { describe, expect, it } from 'vitest'
import type { PaymentValues } from 'src/pages/Checkout/Payment/components/PaymentForm'
import { toPlaceOrderRequest } from 'src/pages/Checkout/placeOrderRequest'

const delivery = { streetAddress: ' 12 Flinders Street ', suburb: 'North Wollongong', state: 'NSW', postcode: '2500' }
const card: PaymentValues = {
  method: 'card_mock',
  nameOnCard: ' Jordan Shaw ',
  number: '4242 4242 4242 4242',
  expiry: '12 / 30',
  cvc: '123',
}

describe('toPlaceOrderRequest', () => {
  it('turns the typed card into its digits, month and full year', () => {
    expect(toPlaceOrderRequest(delivery, card).payment).toEqual({
      method: 'card_mock',
      card: { number: '4242424242424242', expiryMonth: 12, expiryYear: 2030, cvc: '123', nameOnCard: 'Jordan Shaw' },
    })
  })

  it('trims the address and leaves out the optional fields that were blank', () => {
    expect(toPlaceOrderRequest({ ...delivery, attentionName: '  ', notes: '' }, card).delivery).toEqual({
      streetAddress: '12 Flinders Street',
      suburb: 'North Wollongong',
      state: 'NSW',
      postcode: '2500',
    })
  })

  it('keeps the optional fields that were filled in', () => {
    expect(toPlaceOrderRequest({ ...delivery, attentionName: 'Jordan', notes: 'Back door' }, card).delivery).toMatchObject({
      attentionName: 'Jordan',
      notes: 'Back door',
    })
  })

  it('sends no card for an invoice on account, even if card boxes were filled before switching', () => {
    expect(toPlaceOrderRequest(delivery, { ...card, method: 'invoice_on_account' }).payment).toEqual({
      method: 'invoice_on_account',
    })
  })

  it('never sends a country: the backend does not take one', () => {
    expect(toPlaceOrderRequest(delivery, card).delivery).not.toHaveProperty('country')
  })
})
