import { promises as fs } from 'fs'
import * as path from 'path'
import { Injectable } from '@nestjs/common'
import {
  Delivery,
  Invoice,
  Order,
  OrderItem,
  OrderStatus,
} from '@sa-marketplace/entities'
import { DataSource, EntityManager } from 'typeorm'
import { AppError, BusinessException } from '../../configs/app.exception'
import { PdfService } from '../pdf/pdf.service'
import {
  relativeInvoicePdfPath,
  resolveInvoicePdfPath,
} from './invoice-storage'
import { InvoiceTemplateData, renderInvoiceHtml } from './invoice.template'

export interface InvoiceDownload {
  filename: string
  buffer: Buffer
}

// One invoice per order, shared by the buyer and seller apps (§4.4).
@Injectable()
export class InvoiceService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly pdfService: PdfService,
  ) {}

  // The caller proves the order is theirs; `order` needs supplierProfile and organisation loaded.
  async getInvoicePdf(order: Order): Promise<InvoiceDownload> {
    // Step 1: invoices exist only once the order has dispatched (db:verify enforces it too).
    if (
      order.status !== OrderStatus.dispatched &&
      order.status !== OrderStatus.delivered
    ) {
      throw new BusinessException(
        AppError.ECB409,
        'The invoice is not available until this order has dispatched',
      )
    }

    const filename = `${order.orderNumber}-invoice.pdf`

    // Step 2: one caller at a time per order, so two simultaneous first downloads cannot both issue an invoice.
    return await this.dataSource.transaction(async (manager) => {
      await manager.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
        order.id,
      ])

      // Step 3: a stored PDF is served as-is, never regenerated (ADR 0036).
      const existing = await manager.findOneBy(Invoice, { orderId: order.id })
      if (existing) {
        const buffer = await fs.readFile(
          resolveInvoicePdfPath(existing.pdfPath),
        )
        return { filename, buffer }
      }

      // Step 4: load the lines and delivery address the first time only.
      const [items, delivery] = await Promise.all([
        manager.find(OrderItem, {
          where: { orderId: order.id },
          order: { productName: 'ASC', id: 'ASC' },
        }),
        manager.findOneByOrFail(Delivery, { orderId: order.id }),
      ])

      // Step 5: billing address is optional, so fall back to the delivery address.
      const buyerAddress =
        order.organisation?.billingAddress ??
        [
          delivery.streetAddress,
          `${delivery.suburb} ${delivery.state} ${delivery.postcode}`,
          delivery.country,
        ].join('\n')

      // Step 6: take the next invoice number just before writing, to minimise gaps (ADR 0022).
      const invoiceNumber = await this.nextInvoiceNumber(manager)
      const issuedAt = new Date()

      // Step 7: render the PDF from the frozen order, seller and buyer details.
      const buyerOrganisationName = order.organisation?.name ?? 'N/A'
      const templateData: InvoiceTemplateData = {
        invoiceNumber,
        issuedAt,
        orderNumber: order.orderNumber,
        sellerBusinessName: order.supplierProfile.businessName,
        sellerAbn: order.supplierProfile.abn,
        buyerOrganisationName,
        buyerAddress,
        items: items.map((item) => ({
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPriceAtPurchase,
          lineTotal: item.lineTotal,
        })),
        subtotal: order.subtotal,
        gstTotal: order.gstTotal,
        total: order.total,
      }
      const buffer = await this.pdfService.renderPdf(
        renderInvoiceHtml(templateData),
      )

      // Step 8: store the file; pdf_path is relative so it is not tied to one machine.
      const relativePath = relativeInvoicePdfPath(invoiceNumber)
      const absolutePath = resolveInvoicePdfPath(relativePath)
      await fs.mkdir(path.dirname(absolutePath), { recursive: true })
      await fs.writeFile(absolutePath, buffer)

      // Step 9: copy seller and buyer details onto the row so a rename never rewrites it (§4.4); no row, no file.
      try {
        await manager.insert(Invoice, {
          orderId: order.id,
          invoiceNumber,
          issuedAt,
          sellerBusinessName: order.supplierProfile.businessName,
          sellerAbn: order.supplierProfile.abn,
          buyerOrganisationName,
          buyerAddress,
          subtotal: order.subtotal,
          gstTotal: order.gstTotal,
          total: order.total,
          pdfPath: relativePath,
        })
      } catch (error) {
        await fs.rm(absolutePath, { force: true })
        throw error
      }

      return { filename, buffer }
    })
  }

  private async nextInvoiceNumber(manager: EntityManager): Promise<string> {
    const [{ value }] = (await manager.query(
      `SELECT nextval('invoice_number_seq') AS value`,
    )) as [{ value: string }]
    const year = new Date().getFullYear()
    return `INV-${year}-${value.padStart(5, '0')}`
  }
}
