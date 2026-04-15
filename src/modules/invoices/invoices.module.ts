import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { PdfService } from './pdf.service';

@Module({
  controllers: [InvoicesController],
  providers: [InvoicesService, PdfService],
  exports: [InvoicesService, PdfService],
})
export class InvoicesModule {}
