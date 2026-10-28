/** Postgres type: payment_status */
export enum PaymentStatus {
  pending = 'pending',
  paid = 'paid',
  failed = 'failed',
  /** A paid order that was cancelled; the mock gateway moves no real money. */
  refunded = 'refunded',
}
