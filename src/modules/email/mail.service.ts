import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('MAIL_HOST', 'smtp.gmail.com'),
      port: this.config.get<number>('MAIL_PORT', 587),
      secure: false,
      auth: {
        user: this.config.get('MAIL_USER'),
        pass: this.config.get('MAIL_PASSWORD'),
      },
    });
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }) {
    const from = params.from || this.config.get('MAIL_FROM', 'Bookhou <noreply@bookhou.com>');

    const result = await this.transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    return {
      messageId: result.messageId,
      accepted: result.accepted,
    };
  }

  // Task #21: Invitation email with proper wording
  async sendInvitationEmail(params: {
    to: string;
    hostName: string;
    childName: string;
    partyName: string;
    partyDate: string;
    partyTime: string;
    locationName: string;
    locationAddress: string;
    rsvpLink: string;
    waiverLink: string;
  }) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You're Invited!</h2>
        <p><strong>${params.hostName}</strong> has invited you to <strong>${params.childName}'s</strong> birthday party!</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Event:</strong> ${params.partyName}</p>
          <p><strong>Date:</strong> ${params.partyDate}</p>
          <p><strong>Time:</strong> ${params.partyTime}</p>
          <p><strong>Location:</strong> ${params.locationName}</p>
          <p>${params.locationAddress}</p>
        </div>
        <div style="margin: 20px 0;">
          <a href="${params.rsvpLink}" style="background: #6c5ce7; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-right: 10px;">RSVP Now</a>
        </div>
        <p style="margin-top: 20px;">Please <a href="${params.waiverLink}">sign the waiver</a> before attending. You'll need a copy at check-in to receive your birthday boost cards.</p>
      </div>
    `;

    return this.sendEmail({
      to: params.to,
      subject: `${params.hostName} has invited you to ${params.childName}'s birthday party!`,
      html,
    });
  }

  // Send email with file attachments (for invoices)
  async sendEmailWithAttachment(params: {
    to: string;
    subject: string;
    html: string;
    from?: string;
    attachments?: Array<{
      filename: string;
      content: Buffer;
      contentType: string;
    }>;
  }) {
    const from = params.from || this.config.get('MAIL_FROM', 'Bookoo Bookings <noreply@bookoobookings.com>');

    const result = await this.transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      attachments: params.attachments,
    });

    return {
      messageId: result.messageId,
      accepted: result.accepted,
    };
  }

  // Task #16: Balance settled with invoice
  async sendBalanceSettledEmail(params: {
    to: string;
    hostName: string;
    partyName: string;
    total: string;
    invoiceLink: string;
  }) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Payment Confirmed</h2>
        <p>Dear ${params.hostName},</p>
        <p>Your balance for <strong>${params.partyName}</strong> has been fully settled.</p>
        <p><strong>Total: $${params.total}</strong></p>
        <div style="margin: 20px 0;">
          <a href="${params.invoiceLink}" style="background: #00b894; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">View Invoice</a>
        </div>
        <p>Thank you for your booking!</p>
      </div>
    `;

    return this.sendEmail({
      to: params.to,
      subject: `Payment Confirmed - ${params.partyName}`,
      html,
    });
  }
}
