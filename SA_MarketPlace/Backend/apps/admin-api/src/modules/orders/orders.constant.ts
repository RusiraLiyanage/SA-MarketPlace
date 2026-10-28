// Rows per database read while streaming an export, so memory stays flat however big the file is.
export const EXPORT_BATCH_SIZE = 500

// The most rows one export may hold unless ORDER_EXPORT_MAX_ROWS says otherwise. Over it the request
// fails before any byte is sent, because a stream that breaks halfway cannot report an error status.
export const DEFAULT_EXPORT_MAX_ROWS = 10_000

export const EXPORT_COLUMNS = [
  'Order number',
  'Customer',
  'Supplier',
  'Placed (UTC)',
  'Total (GST incl.)',
  'Payment status',
  'Payment method',
  'Fulfilment',
] as const
