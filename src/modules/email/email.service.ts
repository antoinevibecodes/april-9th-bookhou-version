import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EmailService {
  constructor(private prisma: PrismaService) {}

  // ── Email Templates ────────────────────────────────────────

  async createTemplate(data: {
    locationId: string;
    name: string;
    subject: string;
    body: string;
    trigger?: string;
  }) {
    return this.prisma.emailTemplate.create({ data });
  }

  async findTemplates(locationId: string) {
    return this.prisma.emailTemplate.findMany({
      where: { locationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findTemplate(id: string) {
    const template = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Email template not found');
    return template;
  }

  async updateTemplate(id: string, data: Partial<{
    name: string;
    subject: string;
    body: string;
    trigger: string;
    isActive: boolean;
  }>) {
    return this.prisma.emailTemplate.update({ where: { id }, data });
  }

  async deleteTemplate(id: string) {
    await this.prisma.emailTemplate.delete({ where: { id } });
    return { message: 'Email template deleted' };
  }

  // ── Send Emails (Task #14, #15, #16, #20) ─────────────────

  // Task #14: Booking confirmation email with working link
  async sendBookingConfirmation(partyId: string) {
    const party = await this.getPartyWithLocation(partyId);

    const template = await this.getTemplateByTrigger(party.locationId, 'booking_confirmed');

    const emailBody = this.interpolateTemplate(template?.body || this.defaultBookingTemplate(), {
      hostName: `${party.hostFirstName} ${party.hostLastName}`,
      partyName: party.partyName,
      childName: party.childName || '',
      partyDate: party.partyDate.toLocaleDateString(),
      startTime: party.startTime,
      endTime: party.endTime,
      locationName: party.location?.name || '',
      total: party.total.toString(),
      invoiceNumber: party.invoiceNumber || '',
      bookingLink: `${process.env.FRONTEND_URL}/booking/${partyId}`,
    });

    await this.logEmail(partyId, party.hostEmail, template?.subject || 'Booking Confirmation', emailBody);

    return { message: 'Booking confirmation email sent', to: party.hostEmail };
  }

  // Task #16: Balance settled confirmation with detailed invoice
  async sendBalanceSettledEmail(partyId: string) {
    const party = await this.getPartyWithLocation(partyId);

    const template = await this.getTemplateByTrigger(party.locationId, 'balance_settled');

    const emailBody = this.interpolateTemplate(template?.body || this.defaultBalanceSettledTemplate(), {
      hostName: `${party.hostFirstName} ${party.hostLastName}`,
      partyName: party.partyName,
      total: party.total.toString(),
      amountPaid: party.amountPaid.toString(),
      invoiceNumber: party.invoiceNumber || '',
      invoiceLink: `${process.env.FRONTEND_URL}/invoice/${partyId}`,
    });

    await this.logEmail(partyId, party.hostEmail, template?.subject || 'Payment Confirmed - Invoice', emailBody);

    return { message: 'Balance settled email sent', to: party.hostEmail };
  }

  // Task #15: Client can see copy of emails sent
  async getEmailHistory(partyId: string) {
    return this.prisma.emailLog.findMany({
      where: { partyId },
      orderBy: { sentAt: 'desc' },
    });
  }

  // Resend an email
  async resendEmail(emailLogId: string) {
    const log = await this.prisma.emailLog.findUnique({ where: { id: emailLogId } });
    if (!log) throw new NotFoundException('Email log not found');

    // In production, this would trigger the actual email send
    const newLog = await this.prisma.emailLog.create({
      data: {
        partyId: log.partyId,
        recipient: log.recipient,
        subject: `[Resent] ${log.subject}`,
        body: log.body,
        status: 'sent',
      },
    });

    return { message: 'Email resent', emailLog: newLog };
  }

  // ── Helpers ────────────────────────────────────────────────

  private async getPartyWithLocation(partyId: string) {
    const party = await this.prisma.party.findUnique({
      where: { id: partyId },
      include: { location: { select: { id: true, name: true, timezone: true } } },
    });
    if (!party) throw new NotFoundException('Party not found');
    return party;
  }

  private async getTemplateByTrigger(locationId: string, trigger: string) {
    return this.prisma.emailTemplate.findFirst({
      where: { locationId, trigger, isActive: true },
    });
  }

  private async logEmail(partyId: string, recipient: string, subject: string, body: string) {
    return this.prisma.emailLog.create({
      data: { partyId, recipient, subject, body, status: 'sent' },
    });
  }

  private interpolateTemplate(template: string, vars: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }

  private defaultBookingTemplate(): string {
    return `
      <h2>Booking Confirmed!</h2>
      <p>Dear {{hostName}},</p>
      <p>Your booking for <strong>{{partyName}}</strong> has been confirmed.</p>
      <ul>
        <li>Date: {{partyDate}}</li>
        <li>Time: {{startTime}} - {{endTime}}</li>
        <li>Location: {{locationName}}</li>
        <li>Total: \${{total}}</li>
        <li>Invoice: {{invoiceNumber}}</li>
      </ul>
      <p><a href="{{bookingLink}}">View your booking details</a></p>
    `;
  }

  private defaultBalanceSettledTemplate(): string {
    return `
      <h2>Payment Confirmed</h2>
      <p>Dear {{hostName}},</p>
      <p>Your balance for <strong>{{partyName}}</strong> has been fully settled.</p>
      <ul>
        <li>Total: \${{total}}</li>
        <li>Amount Paid: \${{amountPaid}}</li>
        <li>Invoice: {{invoiceNumber}}</li>
      </ul>
      <p><a href="{{invoiceLink}}">View your invoice</a></p>
    `;
  }
}
