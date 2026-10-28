import type { DeliveryValues } from 'src/pages/Checkout/checkoutOutletContext'
import type { PaymentValues } from 'src/pages/Checkout/Payment/components/PaymentForm'
import type { PlaceOrderRequest } from 'src/store/checkout/types'
import { parseExpiry } from 'src/utils/card'

// The form's address and payment as the backend takes them: optional fields that were left blank are left out, and a card's
// grouped number and "MM / YY" expiry become its plain digits, month and full year.
export const toPlaceOrderRequest = (delivery: DeliveryValues, payment: PaymentValues): PlaceOrderRequest => {
  const { attentionName, streetAddress, suburb, state, postcode, notes } = delivery
  const expiry = payment.expiry ? parseExpiry(payment.expiry) : null

  return {
    delivery: {
      ...(attentionName?.trim() && { attentionName: attentionName.trim() }),
      streetAddress: streetAddress.trim(),
      suburb: suburb.trim(),
      state,
      postcode,
      ...(notes?.trim() && { notes: notes.trim() }),
    },
    payment:
      payment.method === 'card_mock' && payment.number && payment.cvc && payment.nameOnCard && expiry
        ? {
            method: 'card_mock',
            card: {
              number: payment.number.replace(/\D/g, ''),
              expiryMonth: expiry.month,
              expiryYear: expiry.year,
              cvc: payment.cvc,
              nameOnCard: payment.nameOnCard.trim(),
            },
          }
        : { method: payment.method },
  }
}
