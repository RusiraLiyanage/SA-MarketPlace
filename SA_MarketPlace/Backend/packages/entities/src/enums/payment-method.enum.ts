/** Postgres type: payment_method. Phase 1 checkout is mocked; no real gateway. */
export enum PaymentMethod {
  cardMock = 'card_mock',
  invoiceOnAccount = 'invoice_on_account',
}
