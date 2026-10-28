import type { Payment } from 'src/types'

// "Credit card (mock, ending 3456)" or "Invoice on account": what a buyer reads, not the stored method name.
export const describePayment = ({ method, cardLast4 }: Pick<Payment, 'method' | 'cardLast4'>): string =>
  method === 'invoice_on_account'
    ? 'Invoice on account'
    : `Credit card (mock${cardLast4 ? `, ending ${cardLast4}` : ''})`
