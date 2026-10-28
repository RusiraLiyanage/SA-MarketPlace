import { Module } from '@nestjs/common'
import { PdfModule } from '../pdf/pdf.module'
import { InvoiceService } from './invoice.service'

@Module({
  imports: [PdfModule],
  providers: [InvoiceService],
  exports: [InvoiceService],
})
export class InvoiceModule {}
