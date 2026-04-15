import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { InvoicesService } from './invoices.service';

// Task #18: Invoice must include package contents, refund policy, logo
// Task #19: Tax as percentage
// Task #25: Card details on invoice
@Injectable()
export class PdfService {
  constructor(private invoicesService: InvoicesService) {}

  async generateInvoicePdf(partyId: string): Promise<Buffer> {
    const invoice = await this.invoicesService.generateInvoice(partyId);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('INVOICE', { align: 'right' });
      doc.moveDown(0.5);

      // Business info
      doc.fontSize(12).font('Helvetica-Bold').text(invoice.business.name || 'Bookhou');
      doc.fontSize(10).font('Helvetica');
      if (invoice.business.locationName) doc.text(invoice.business.locationName);
      if (invoice.business.address) doc.text(invoice.business.address);
      if (invoice.business.city) {
        doc.text(`${invoice.business.city}, ${invoice.business.state} ${invoice.business.zipCode}`);
      }
      if (invoice.business.phone) doc.text(`Phone: ${invoice.business.phone}`);
      if (invoice.business.email) doc.text(`Email: ${invoice.business.email}`);

      doc.moveDown();

      // Invoice details
      doc.fontSize(10).font('Helvetica-Bold').text(`Invoice No: ${invoice.invoiceNumber}`);
      doc.font('Helvetica');
      doc.text(`Event: ${invoice.event.name}`);
      doc.text(`Date: ${invoice.event.date}`);
      doc.text(`Time: ${invoice.event.time}`);
      if (invoice.event.room) doc.text(`Room: ${invoice.event.room}`);
      doc.text(`Guests: ${invoice.event.guestCount}`);

      doc.moveDown();

      // Host details
      doc.font('Helvetica-Bold').text('Host Details');
      doc.font('Helvetica');
      doc.text(`Name: ${invoice.host.name}`);
      doc.text(`Email: ${invoice.host.email}`);
      doc.text(`Phone: ${invoice.host.phone}`);

      doc.moveDown();

      // Line items table
      doc.font('Helvetica-Bold');
      const tableTop = doc.y;
      doc.text('Item', 50, tableTop, { width: 200 });
      doc.text('Price', 260, tableTop, { width: 80, align: 'right' });
      doc.text('Qty', 350, tableTop, { width: 50, align: 'center' });
      doc.text('Amount', 410, tableTop, { width: 100, align: 'right' });

      doc.moveTo(50, doc.y + 5).lineTo(510, doc.y + 5).stroke();
      doc.moveDown(0.5);

      doc.font('Helvetica');
      for (const item of invoice.items) {
        const y = doc.y;
        doc.text(item.name, 50, y, { width: 200 });
        if (item.description) {
          doc.fontSize(8).fillColor('#666').text(item.description, 50, doc.y, { width: 200 });
          doc.fontSize(10).fillColor('#000');
        }
        doc.text(`$${Number(item.price).toFixed(2)}`, 260, y, { width: 80, align: 'right' });
        doc.text(String(item.quantity), 350, y, { width: 50, align: 'center' });
        doc.text(`$${Number(item.amount).toFixed(2)}`, 410, y, { width: 100, align: 'right' });
        doc.moveDown(0.3);
      }

      doc.moveTo(50, doc.y + 5).lineTo(510, doc.y + 5).stroke();
      doc.moveDown();

      // Totals
      const totalsX = 350;
      doc.text('Sub Total:', totalsX, doc.y, { width: 80 });
      doc.text(`$${Number(invoice.subtotal).toFixed(2)}`, 430, doc.y - doc.currentLineHeight(), { width: 80, align: 'right' });

      if (Number(invoice.discount) > 0) {
        doc.text('Discount:', totalsX, doc.y, { width: 80 });
        doc.text(`-$${Number(invoice.discount).toFixed(2)}`, 430, doc.y - doc.currentLineHeight(), { width: 80, align: 'right' });
      }

      // Task #19: Tax as percentage
      doc.text(`Tax (${invoice.taxRate}):`, totalsX, doc.y, { width: 80 });
      doc.text(`$${Number(invoice.taxAmount).toFixed(2)}`, 430, doc.y - doc.currentLineHeight(), { width: 80, align: 'right' });

      doc.moveDown(0.3);
      doc.font('Helvetica-Bold');
      doc.text('Total:', totalsX, doc.y, { width: 80 });
      doc.text(`$${Number(invoice.total).toFixed(2)}`, 430, doc.y - doc.currentLineHeight(), { width: 80, align: 'right' });

      doc.moveDown(0.5);
      doc.font('Helvetica');
      doc.text(`Amount Paid: $${Number(invoice.amountPaid).toFixed(2)}`, totalsX);

      // Task #8: Show refunded amount
      if (Number(invoice.amountRefunded) > 0) {
        doc.fillColor('#cc0000');
        doc.text(`Amount Refunded: $${Number(invoice.amountRefunded).toFixed(2)}`, totalsX);
        doc.fillColor('#000');
      }

      const balance = Number(invoice.balance);
      if (balance > 0) {
        doc.fillColor('#cc0000').font('Helvetica-Bold');
        doc.text(`Balance Due: $${balance.toFixed(2)}`, totalsX);
        doc.fillColor('#000').font('Helvetica');
      } else {
        doc.fillColor('#009900').font('Helvetica-Bold');
        doc.text('PAID IN FULL', totalsX);
        doc.fillColor('#000').font('Helvetica');
      }

      // Task #25: Card details
      if (invoice.cardDetails.length > 0) {
        doc.moveDown();
        doc.font('Helvetica-Bold').text('Payment Details');
        doc.font('Helvetica');
        for (const card of invoice.cardDetails) {
          doc.text(`${card.cardBrand || 'Card'} ending ${card.cardLast4} - ${card.cardholderName || 'N/A'} - $${Number(card.amount).toFixed(2)} on ${card.date}`);
        }
      }

      // Refund details
      if (invoice.refunds.length > 0) {
        doc.moveDown();
        doc.font('Helvetica-Bold').text('Refunds');
        doc.font('Helvetica');
        for (const refund of invoice.refunds) {
          doc.text(`$${Number(refund.amount).toFixed(2)} - ${refund.reason || 'N/A'} - ${refund.date}`);
        }
      }

      // Task #18: Refund policy
      if (invoice.refundPolicy) {
        doc.moveDown();
        doc.font('Helvetica-Bold').text('Refund Policy');
        doc.font('Helvetica').fontSize(8);
        doc.text(invoice.refundPolicy);
      }

      doc.end();
    });
  }
}
