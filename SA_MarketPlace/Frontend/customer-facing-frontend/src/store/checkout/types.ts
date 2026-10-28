import type { PaymentMethod } from 'src/types'

// What POST /checkout takes. The backend rejects fields it does not know, so there is no country here: it is always Australia.
export interface PlaceOrderRequest {
  delivery: {
    attentionName?: string
    streetAddress: string
    suburb: string
    state: string
    postcode: string
    notes?: string
  }
  payment: {
    method: PaymentMethod
    /** Only for a card payment; it is used for this one request and never stored (backend ADR 0024). */
    card?: {
      /** A string, so leading zeros survive. */
      number: string
      expiryMonth: number
      /** The full year, for example 2029. */
      expiryYear: number
      cvc: string
      nameOnCard: string
    }
  }
}
