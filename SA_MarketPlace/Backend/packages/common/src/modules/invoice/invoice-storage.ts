import * as path from 'path'
import { STORAGE_ROOT } from '../storage/storage-root'

// invoice.pdf_path is stored relative ("invoices/INV-2026-00004.pdf"), never
// as an absolute path tied to one machine's filesystem layout.
export const relativeInvoicePdfPath = (invoiceNumber: string): string =>
  path.join('invoices', `${invoiceNumber}.pdf`)

export const resolveInvoicePdfPath = (relativePath: string): string =>
  path.join(STORAGE_ROOT, relativePath)
