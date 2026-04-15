import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { PdfService } from './pdf.service';

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('invoices')
export class InvoicesController {
  constructor(
    private invoicesService: InvoicesService,
    private pdfService: PdfService,
  ) {}

  // Task #16, #18: Generate and return full invoice data (JSON)
  @Get('party/:partyId')
  generateInvoice(@Param('partyId') partyId: string) {
    return this.invoicesService.generateInvoice(partyId);
  }

  // Task #16: Download invoice as PDF
  @Get('party/:partyId/pdf')
  async downloadPdf(@Param('partyId') partyId: string, @Res() res: Response) {
    const pdfBuffer = await this.pdfService.generateInvoicePdf(partyId);
    const invoice = await this.invoicesService.generateInvoice(partyId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }
}
