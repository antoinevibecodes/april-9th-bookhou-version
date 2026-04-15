import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { formatLocalDate, formatLocalDateTime } from '../../common/helpers/timezone.helper';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  // Task #16, #18, #19, #25: Generate proper invoice data
  async generateInvoice(partyId: string) {
    const party = await this.prisma.party.findUnique({
      where: { id: partyId },
      include: {
        package: true,
        room: { select: { name: true } },
        addons: { include: { addon: true } },
        payments: { where: { status: { in: ['PAID', 'REFUND'] } }, orderBy: { createdAt: 'desc' } },
        location: {
          select: {
            name: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            phone: true,
            email: true,
            timezone: true,
            currency: true,
            refundPolicy: true,
            business: { select: { name: true, logoUrl: true } },
          },
        },
      },
    });

    if (!party) throw new NotFoundException('Party not found');

    const tz = party.location?.timezone || 'America/New_York';

    // Task #18: Invoice must include package contents
    const packageContents = party.package?.contents || null;

    // Task #19: Tax as percentage, not flat amount
    const taxRatePercent = Number(party.taxRate) * 100;

    // Task #25: Card details on invoice
    const cardPayments = party.payments
      .filter((p) => p.cardLast4)
      .map((p) => ({
        cardLast4: p.cardLast4,
        cardholderName: p.cardholderName,
        cardBrand: p.cardBrand,
        amount: p.amount,
        date: formatLocalDateTime(p.processedAt, tz),
      }));

    // Task #8: Refund amounts in invoice
    const refunds = party.payments
      .filter((p) => p.status === 'REFUND')
      .map((p) => ({
        amount: p.amount,
        reason: p.refundReason || p.note,
        date: formatLocalDateTime(p.processedAt, tz),
      }));

    return {
      invoiceNumber: party.invoiceNumber,

      // Business info (Task #18: logo)
      business: {
        name: party.location?.business?.name,
        logoUrl: party.location?.business?.logoUrl,
        locationName: party.location?.name,
        address: party.location?.address,
        city: party.location?.city,
        state: party.location?.state,
        zipCode: party.location?.zipCode,
        phone: party.location?.phone,
        email: party.location?.email,
      },

      // Host details
      host: {
        name: `${party.hostFirstName} ${party.hostLastName}`,
        email: party.hostEmail,
        phone: party.hostPhone,
      },

      // Event details
      event: {
        name: party.partyName,
        date: formatLocalDate(party.partyDate, tz),
        time: `${party.startTime} to ${party.endTime}`,
        guestCount: party.guestCount,
        room: party.room?.name,
        childName: party.childName,
      },

      // Line items (Task #18: package contents, proper pricing)
      items: [
        {
          name: party.package?.name || 'Package',
          description: packageContents,
          price: party.packagePrice,
          quantity: 1,
          amount: party.packagePrice,
        },
        ...(Number(party.extraPersonAmount) > 0
          ? [{
              name: 'Extra Guests',
              description: `Additional guests beyond package limit`,
              price: party.extraPersonAmount,
              quantity: 1,
              amount: party.extraPersonAmount,
            }]
          : []),
        ...party.addons.map((a) => ({
          name: a.customName || a.addon?.name || 'Add-on',
          description: a.customDesc || a.addon?.description,
          price: a.price,
          quantity: a.quantity,
          amount: Number(a.price) * a.quantity,
        })),
      ],

      // Pricing
      subtotal: party.subtotal,
      discount: party.discountAmount,
      taxRate: `${taxRatePercent.toFixed(2)}%`,
      taxAmount: party.taxAmount,
      total: party.total,

      // Payment info
      amountPaid: party.amountPaid,
      amountRefunded: party.amountRefunded,
      balance: party.balance,
      cardDetails: cardPayments,
      refunds,

      // Task #18: Refund policy
      refundPolicy: party.location?.refundPolicy,

      // Status
      status: party.status,
      currency: party.location?.currency || 'USD',
    };
  }

  // Get invoice for email sending (Task #16)
  async getInvoiceForEmail(partyId: string) {
    return this.generateInvoice(partyId);
  }
}
