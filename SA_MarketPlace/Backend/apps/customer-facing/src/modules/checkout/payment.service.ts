import { Injectable } from '@nestjs/common'
import { BusinessException } from '@sa-marketplace/common'
import { PaymentMethod, PaymentStatus } from '@sa-marketplace/entities'
import { randomUUID } from 'crypto'
import { MOCK_CARD_DECLINED } from './checkout.constant'
import { CardDto, PaymentDto } from './checkout.dto'
import { CheckoutError } from './checkout.exception'
import { PaymentResult } from './checkout.typing'

// Mock gateway, no real money (CLAUDE.md §5). NEVER store or log card number, CVC or expiry (§4.6).
@Injectable()
export class PaymentService {
  // Called once per checkout, for the grand total of every order in the purchase.
  // amountCents is unused by the mock; a real gateway would send it to the processor.
  async charge(
    amountCents: number,
    payment: PaymentDto,
  ): Promise<PaymentResult> {
    // Step 1: invoice_on_account has no card, so return status pending and no card fields.
    if (payment.method === PaymentMethod.invoiceOnAccount) {
      return {
        status: PaymentStatus.pending,
        transactionReference: null,
        cardLast4: null,
        cardBrand: null,
        paidAt: null,
      }
    }

    // Step 2: card_mock, so validateCard(payment.card); a bad card is INVALID_CARD.
    // PaymentDto's @ValidateIf/@IsDefined guarantee payment.card exists once method
    // is card_mock — the request never reaches here otherwise.
    const card = payment.card as CardDto
    this.validateCard(card)
    const digits = card.number.replace(/\s/g, '')

    // Step 3: the MOCK_CARD_DECLINED number is PAYMENT_DECLINED (402).
    if (digits === MOCK_CARD_DECLINED) {
      throw new BusinessException(
        CheckoutError.PAYMENT_DECLINED.code,
        CheckoutError.PAYMENT_DECLINED.message,
      )
    }

    // Step 4: anything else valid is approved: status paid, paidAt now, and a fake
    //         transactionReference such as MOCK-<uuid>.
    const approved = {
      status: PaymentStatus.paid,
      transactionReference: `MOCK-${randomUUID()}`,
      paidAt: new Date(),
    }

    // Step 5: keep only cardLast4 and cardBrand (detectBrand); the rest is dropped.
    return {
      ...approved,
      cardLast4: digits.slice(-4),
      cardBrand: this.detectBrand(digits),
    }
  }

  // Throws INVALID_CARD. Checks the card is well formed and not expired.
  private validateCard(card: CardDto): void {
    // Step 1: strip spaces from card.number; it must be 13 to 19 digits.
    const digits = card.number.replace(/\s/g, '')
    if (!/^\d{13,19}$/.test(digits)) {
      throw new BusinessException(
        CheckoutError.INVALID_CARD.code,
        CheckoutError.INVALID_CARD.message,
      )
    }

    // Step 2: run the Luhn check (the digit checksum every real card passes).
    // From the rightmost digit, double every second digit; if that goes over 9,
    // subtract 9. A real card number's digits always sum to a multiple of 10.
    let sum = 0
    let doubleThisDigit = false
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = Number(digits[i])
      if (doubleThisDigit) {
        digit *= 2
        if (digit > 9) {
          digit -= 9
        }
      }
      sum += digit
      doubleThisDigit = !doubleThisDigit
    }
    if (sum % 10 !== 0) {
      throw new BusinessException(
        CheckoutError.INVALID_CARD.code,
        CheckoutError.INVALID_CARD.message,
      )
    }

    // Step 3: the expiry month and year must not be in the past.
    const expiresAt = new Date(card.expiryYear, card.expiryMonth, 1)
    if (expiresAt <= new Date()) {
      throw new BusinessException(
        CheckoutError.INVALID_CARD.code,
        CheckoutError.INVALID_CARD.message,
      )
    }
  }

  // Visa starts with 4, Mastercard 5, Amex 3; anything else is "Unknown".
  private detectBrand(digits: string): string {
    switch (digits[0]) {
      case '4':
        return 'Visa'
      case '5':
        return 'Mastercard'
      case '3':
        return 'Amex'
      default:
        return 'Unknown'
    }
  }
}
