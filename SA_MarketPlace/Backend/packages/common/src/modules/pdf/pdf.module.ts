import { Module } from '@nestjs/common'
import { PdfService } from './pdf.service'

// One PdfService per process; its browser is not launched per request (see PdfService).
@Module({
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
