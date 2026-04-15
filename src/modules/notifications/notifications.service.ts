import { Injectable, Logger } from '@nestjs/common';
import { MailService } from '../email/mail.service';
import { SmsService } from '../sms/sms.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

/**
 * Unified Notification Service — sends both Email + SMS for every automation.
 * Mirrors the 29 automations from the original Bookhou Laravel codebase.
 *
 * Email: Gmail SMTP via Nodemailer (noreply@bookoobookings.com)
 * SMS: Twilio
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private frontendUrl: string;

  constructor(
    private mail: MailService,
    private sms: SmsService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3001');
  }

  // ──────────────────────────────────────────────────────────────
  // Helper: send email + SMS + log to DB
  // ──────────────────────────────────────────────────────────────

  private async notify(params: {
    partyId?: string;
    email?: string;
    phone?: string;
    subject: string;
    html: string;
    smsBody: string;
    type: string;
  }) {
    const results = { email: false, sms: false };

    // Send email
    if (params.email) {
      try {
        await this.mail.sendEmail({
          to: params.email,
          subject: params.subject,
          html: params.html,
        });
        results.email = true;
        this.logger.log(`[EMAIL] ${params.type} sent to ${params.email}`);
      } catch (err) {
        this.logger.error(`[EMAIL] ${params.type} failed: ${err.message}`);
      }
    }

    // Send SMS
    if (params.phone) {
      try {
        await this.sms.sendSms({ to: params.phone, body: params.smsBody });
        results.sms = true;
        this.logger.log(`[SMS] ${params.type} sent to ${params.phone}`);
      } catch (err) {
        this.logger.error(`[SMS] ${params.type} failed: ${err.message}`);
      }
    }

    // Log to DB
    if (params.partyId) {
      try {
        await this.prisma.emailLog.create({
          data: {
            partyId: params.partyId,
            recipient: params.email || params.phone || 'unknown',
            subject: params.subject,
            body: params.smsBody,
            status: results.email || results.sms ? 'sent' : 'failed',
          },
        });
      } catch (err) {
        this.logger.error(`[LOG] Failed to log notification: ${err.message}`);
      }
    }

    return results;
  }

  private async getParty(partyId: string) {
    return this.prisma.party.findUnique({
      where: { id: partyId },
      include: {
        location: true,
        package: true,
      },
    });
  }

  // ──────────────────────────────────────────────────────────────
  // 1. PARTY CREATED / BOOKING CONFIRMATION (Template: PB)
  // ──────────────────────────────────────────────────────────────

  async partyCreated(partyId: string) {
    const party = await this.getParty(partyId);
    if (!party) return;

    const hostName = `${party.hostFirstName} ${party.hostLastName}`;
    const childName = party.childName || '';
    const locationName = party.location?.name || 'Tiny Towne';
    const locationAddress = party.location?.address || '2055 Beaver Ruin Road, Norcross, GA 30071';
    const partyDate = party.partyDate?.toLocaleDateString('en-US') || '';
    const bookingLink = `${this.frontendUrl}/booking/${partyId}`;
    const waiverLink = `${this.frontendUrl}/waiver/${partyId}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #c46a2b;">Booking Confirmed!</h2>
        <p>Dear ${hostName},</p>
        <p>Your booking for <strong>${childName}'s</strong> event has been confirmed!</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Event:</strong> ${party.partyName || 'Birthday Party'}</p>
          <p><strong>Date:</strong> ${partyDate}</p>
          <p><strong>Time:</strong> ${party.startTime || ''} - ${party.endTime || ''}</p>
          <p><strong>Location:</strong> ${locationName}</p>
          <p>${locationAddress}</p>
        </div>
        <p>Please sign the waiver before attending:</p>
        <p><a href="${waiverLink}" style="background: #c46a2b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Sign Waiver</a></p>
        <p><a href="${bookingLink}" style="color: #2563eb;">View your booking details</a></p>
        <p>Thank you,<br/>Tiny Towne</p>
      </div>
    `;

    const smsBody = `Hi ${hostName}! Your booking for ${childName}'s event at ${locationName} on ${partyDate} is confirmed. View details: ${bookingLink}`;

    await this.notify({
      partyId,
      email: party.hostEmail,
      phone: party.hostPhone,
      subject: `Booking Confirmed - ${childName}'s Event`,
      html,
      smsBody,
      type: 'PARTY_CREATED',
    });

    // Also notify staff
    await this.notifyStaff(partyId, `New booking: ${childName}'s event on ${partyDate} at ${locationName}. Host: ${hostName}`);
  }

  // ──────────────────────────────────────────────────────────────
  // 2. PARTY REQUEST (customer requests a party, awaiting approval)
  // ──────────────────────────────────────────────────────────────

  async partyRequested(partyId: string) {
    const party = await this.getParty(partyId);
    if (!party) return;

    const hostName = `${party.hostFirstName} ${party.hostLastName}`;
    const childName = party.childName || '';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Party Request Received</h2>
        <p>Dear ${hostName},</p>
        <p>Your party request for <strong>${childName}</strong> has been received. We will review it and get back to you shortly.</p>
        <p>Thank you,<br/>Tiny Towne</p>
      </div>
    `;

    const smsBody = `Hi ${hostName}! Your party request for ${childName} has been received. We'll get back to you shortly. — Tiny Towne`;

    await this.notify({ partyId, email: party.hostEmail, phone: party.hostPhone, subject: `Party Request Received - ${childName}`, html, smsBody, type: 'PARTY_REQUESTED' });
  }

  // ──────────────────────────────────────────────────────────────
  // 3. PARTY UPDATE (details changed)
  // ──────────────────────────────────────────────────────────────

  async partyUpdated(partyId: string) {
    const party = await this.getParty(partyId);
    if (!party) return;

    const hostName = `${party.hostFirstName} ${party.hostLastName}`;
    const partyDate = party.partyDate?.toLocaleDateString('en-US') || '';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Booking Updated</h2>
        <p>Dear ${hostName},</p>
        <p>Your booking for <strong>${party.partyName || 'your event'}</strong> has been updated.</p>
        <p><strong>Date:</strong> ${partyDate}</p>
        <p><strong>Time:</strong> ${party.startTime || ''} - ${party.endTime || ''}</p>
        <p><a href="${this.frontendUrl}/booking/${partyId}" style="color: #2563eb;">View updated booking details</a></p>
        <p>Thank you,<br/>Tiny Towne</p>
      </div>
    `;

    const smsBody = `Hi ${hostName}! Your booking has been updated. Date: ${partyDate}. View details: ${this.frontendUrl}/booking/${partyId}`;

    await this.notify({ partyId, email: party.hostEmail, phone: party.hostPhone, subject: `Booking Updated - ${party.partyName || 'Your Event'}`, html, smsBody, type: 'PARTY_UPDATED' });
  }

  // ──────────────────────────────────────────────────────────────
  // 4. PARTY DATE CHANGE
  // ──────────────────────────────────────────────────────────────

  async partyDateChanged(partyId: string, oldDate: string, newDate: string) {
    const party = await this.getParty(partyId);
    if (!party) return;

    const hostName = `${party.hostFirstName} ${party.hostLastName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Event Date Changed</h2>
        <p>Dear ${hostName},</p>
        <p>The date for <strong>${party.partyName || 'your event'}</strong> has been changed.</p>
        <p><strong>Old Date:</strong> ${oldDate}</p>
        <p><strong>New Date:</strong> ${newDate}</p>
        <p><strong>Time:</strong> ${party.startTime || ''} - ${party.endTime || ''}</p>
        <p>If you have any questions, please contact us.</p>
        <p>Thank you,<br/>Tiny Towne</p>
      </div>
    `;

    const smsBody = `Hi ${hostName}! Your event date has been changed from ${oldDate} to ${newDate}. Contact us with any questions. — Tiny Towne`;

    await this.notify({ partyId, email: party.hostEmail, phone: party.hostPhone, subject: `Date Changed - ${party.partyName || 'Your Event'}`, html, smsBody, type: 'PARTY_DATE_CHANGED' });
  }

  // ──────────────────────────────────────────────────────────────
  // 5. PARTY CANCELLED — HOST (Template: P_C)
  // ──────────────────────────────────────────────────────────────

  async partyCancelledHost(partyId: string, refundAmount?: number) {
    const party = await this.getParty(partyId);
    if (!party) return;

    const hostName = `${party.hostFirstName} ${party.hostLastName}`;
    const refundText = refundAmount ? `A refund of $${refundAmount.toFixed(2)} will be processed.` : '';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Event Cancelled</h2>
        <p>Dear ${hostName},</p>
        <p>Your event <strong>${party.partyName || ''}</strong> has been cancelled.</p>
        ${refundText ? `<p>${refundText}</p>` : ''}
        <p>If you have any questions or would like to reschedule, please contact us at 404-944-4499 or helenfunfactory@gmail.com.</p>
        <p>Thank you,<br/>Tiny Towne</p>
      </div>
    `;

    const smsBody = `Hi ${hostName}, your event has been cancelled. ${refundText} Contact us at 404-944-4499 with any questions. — Tiny Towne`;

    await this.notify({ partyId, email: party.hostEmail, phone: party.hostPhone, subject: `Event Cancelled - ${party.partyName || 'Your Event'}`, html, smsBody, type: 'PARTY_CANCELLED_HOST' });
  }

  // ──────────────────────────────────────────────────────────────
  // 6. PARTY CANCELLED — GUESTS (Template: P_C_G)
  // ──────────────────────────────────────────────────────────────

  async partyCancelledGuests(partyId: string) {
    const party = await this.getParty(partyId);
    if (!party) return;

    const invitations = await this.prisma.invitation.findMany({ where: { partyId } });
    const hostName = `${party.hostFirstName} ${party.hostLastName}`;

    for (const invite of invitations) {
      const guestName = invite.guestName || 'Guest';

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Event Cancelled</h2>
          <p>Dear ${guestName},</p>
          <p>We're sorry to inform you that <strong>${party.childName || ''}'s</strong> event hosted by ${hostName} has been cancelled.</p>
          <p>If you have any questions, please contact the host directly.</p>
          <p>Thank you,<br/>Tiny Towne</p>
        </div>
      `;

      const smsBody = `Hi ${guestName}, ${party.childName}'s event hosted by ${hostName} has been cancelled. Contact the host for details. — Tiny Towne`;

      await this.notify({ partyId, email: invite.guestEmail ?? undefined, phone: invite.guestPhone ?? undefined, subject: `Event Cancelled - ${party.childName || ''}'s Party`, html, smsBody, type: 'PARTY_CANCELLED_GUEST' });
    }
  }

  // ──────────────────────────────────────────────────────────────
  // 7. PARTY REJECTED
  // ──────────────────────────────────────────────────────────────

  async partyRejected(partyId: string, reason?: string) {
    const party = await this.getParty(partyId);
    if (!party) return;

    const hostName = `${party.hostFirstName} ${party.hostLastName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Party Request Not Approved</h2>
        <p>Dear ${hostName},</p>
        <p>Unfortunately, your party request for <strong>${party.childName || ''}</strong> could not be approved at this time.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>Please contact us at 404-944-4499 to discuss other available options.</p>
        <p>Thank you,<br/>Tiny Towne</p>
      </div>
    `;

    const smsBody = `Hi ${hostName}, your party request could not be approved. Please call us at 404-944-4499 to discuss other options. — Tiny Towne`;

    await this.notify({ partyId, email: party.hostEmail, phone: party.hostPhone, subject: `Party Request Update`, html, smsBody, type: 'PARTY_REJECTED' });
  }

  // ──────────────────────────────────────────────────────────────
  // 8. PARTY COMPLETED / FEEDBACK REQUEST (Template: P_CO)
  // ──────────────────────────────────────────────────────────────

  async partyCompleted(partyId: string, googleReviewUrl?: string) {
    const party = await this.getParty(partyId);
    if (!party) return;

    const hostName = `${party.hostFirstName} ${party.hostLastName}`;
    const reviewUrl = googleReviewUrl || 'https://g.page/tinytowne/review';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Thank You!</h2>
        <p>Dear ${hostName},</p>
        <p>Thank you for celebrating <strong>${party.childName || ''}'s</strong> event with us at Tiny Towne!</p>
        <p>We hope everyone had a wonderful time. If you enjoyed your experience, we'd love to hear about it:</p>
        <p><a href="${reviewUrl}" style="background: #c46a2b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Leave a Review</a></p>
        <p>We look forward to seeing you again!</p>
        <p>Thank you,<br/>Tiny Towne</p>
      </div>
    `;

    const smsBody = `Hi ${hostName}! Thank you for celebrating with us at Tiny Towne! We'd love your feedback: ${reviewUrl} — Tiny Towne`;

    await this.notify({ partyId, email: party.hostEmail, phone: party.hostPhone, subject: `Thank You - ${party.childName || ''}'s Event`, html, smsBody, type: 'PARTY_COMPLETED' });
  }

  // ──────────────────────────────────────────────────────────────
  // 9. PAYMENT RECEIVED (Template: PM_C)
  // ──────────────────────────────────────────────────────────────

  async paymentReceived(partyId: string, amount: number, paymentMethod: string) {
    const party = await this.getParty(partyId);
    if (!party) return;

    const hostName = `${party.hostFirstName} ${party.hostLastName}`;
    const total = party.total || 0;
    const amountPaid = Number(party.amountPaid || 0) + amount;
    const remaining = Math.max(0, Number(total) - amountPaid);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Payment Received</h2>
        <p>Dear ${hostName},</p>
        <p>We've received your payment of <strong>$${amount.toFixed(2)}</strong> via ${paymentMethod}.</p>
        <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Total:</strong> $${Number(total).toFixed(2)}</p>
          <p><strong>Paid:</strong> $${amountPaid.toFixed(2)}</p>
          <p><strong>Remaining:</strong> $${remaining.toFixed(2)}</p>
        </div>
        <p><a href="${this.frontendUrl}/booking/${partyId}" style="color: #2563eb;">View booking details</a></p>
        <p>Thank you,<br/>Tiny Towne</p>
      </div>
    `;

    const smsBody = `Hi ${hostName}! Payment of $${amount.toFixed(2)} received. Remaining balance: $${remaining.toFixed(2)}. — Tiny Towne`;

    await this.notify({ partyId, email: party.hostEmail, phone: party.hostPhone, subject: `Payment Received - $${amount.toFixed(2)}`, html, smsBody, type: 'PAYMENT_RECEIVED' });
  }

  // ──────────────────────────────────────────────────────────────
  // 10. BALANCE SETTLED (Template: PM_C when balance = 0)
  // ──────────────────────────────────────────────────────────────

  async balanceSettled(partyId: string) {
    const party = await this.getParty(partyId);
    if (!party) return;

    const hostName = `${party.hostFirstName} ${party.hostLastName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60;">Balance Fully Paid!</h2>
        <p>Dear ${hostName},</p>
        <p>Your balance for <strong>${party.partyName || 'your event'}</strong> has been fully settled. Thank you!</p>
        <p><strong>Total Paid:</strong> $${Number(party.total || 0).toFixed(2)}</p>
        <p><a href="${this.frontendUrl}/invoice/${partyId}" style="background: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">View Invoice</a></p>
        <p>Thank you,<br/>Tiny Towne</p>
      </div>
    `;

    const smsBody = `Hi ${hostName}! Your balance for your event is fully paid. Total: $${Number(party.total || 0).toFixed(2)}. Thank you! — Tiny Towne`;

    await this.notify({ partyId, email: party.hostEmail, phone: party.hostPhone, subject: `Payment Complete - ${party.partyName || 'Your Event'}`, html, smsBody, type: 'BALANCE_SETTLED' });
  }

  // ──────────────────────────────────────────────────────────────
  // 11. PAYMENT REFUND (Template: PM_R)
  // ──────────────────────────────────────────────────────────────

  async paymentRefunded(partyId: string, refundAmount: number) {
    const party = await this.getParty(partyId);
    if (!party) return;

    const hostName = `${party.hostFirstName} ${party.hostLastName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Refund Processed</h2>
        <p>Dear ${hostName},</p>
        <p>A refund of <strong>$${refundAmount.toFixed(2)}</strong> has been processed for <strong>${party.partyName || 'your event'}</strong>.</p>
        <p>Please allow 5-10 business days for the refund to appear on your statement.</p>
        <p><a href="${this.frontendUrl}/booking/${partyId}" style="color: #2563eb;">View booking details</a></p>
        <p>Thank you,<br/>Tiny Towne</p>
      </div>
    `;

    const smsBody = `Hi ${hostName}! A refund of $${refundAmount.toFixed(2)} has been processed. Allow 5-10 business days for it to appear. — Tiny Towne`;

    await this.notify({ partyId, email: party.hostEmail, phone: party.hostPhone, subject: `Refund Processed - $${refundAmount.toFixed(2)}`, html, smsBody, type: 'PAYMENT_REFUNDED' });
  }

  // ──────────────────────────────────────────────────────────────
  // 12. REQUEST FOR PAYMENT (Template: RQP)
  // ──────────────────────────────────────────────────────────────

  async paymentRequested(partyId: string, amountDue: number) {
    const party = await this.getParty(partyId);
    if (!party) return;

    const hostName = `${party.hostFirstName} ${party.hostLastName}`;
    const paymentLink = `${this.frontendUrl}/pay/${partyId}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Payment Reminder</h2>
        <p>Dear ${hostName},</p>
        <p>This is a reminder that a payment of <strong>$${amountDue.toFixed(2)}</strong> is due for <strong>${party.partyName || 'your event'}</strong>.</p>
        <p><a href="${paymentLink}" style="background: #c46a2b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Make Payment</a></p>
        <p>If you've already made this payment, please disregard this message.</p>
        <p>Thank you,<br/>Tiny Towne</p>
      </div>
    `;

    const smsBody = `Hi ${hostName}! Payment of $${amountDue.toFixed(2)} is due for your event. Pay here: ${paymentLink} — Tiny Towne`;

    await this.notify({ partyId, email: party.hostEmail, phone: party.hostPhone, subject: `Payment Reminder - $${amountDue.toFixed(2)} Due`, html, smsBody, type: 'PAYMENT_REQUESTED' });
  }

  // ──────────────────────────────────────────────────────────────
  // 13. GUEST INVITATION (Template: IG)
  // ──────────────────────────────────────────────────────────────

  async guestInvited(partyId: string, invitationId: string) {
    const party = await this.getParty(partyId);
    if (!party) return;

    const invitation = await this.prisma.invitation.findUnique({ where: { id: invitationId } });
    if (!invitation) return;

    const hostName = `${party.hostFirstName} ${party.hostLastName}`;
    const guestName = invitation.guestName || 'Guest';
    const childName = party.childName || '';
    const locationName = party.location?.name || 'Tiny Towne';
    const partyDate = party.partyDate?.toLocaleDateString('en-US') || '';
    const rsvpLink = `${this.frontendUrl}/rsvp/${invitationId}`;
    const waiverLink = `${this.frontendUrl}/waiver/${partyId}?guest=${invitationId}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You're Invited!</h2>
        <p><strong>${hostName}</strong> has invited you to <strong>${childName}'s</strong> birthday party!</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Date:</strong> ${partyDate}</p>
          <p><strong>Time:</strong> ${party.startTime || ''} - ${party.endTime || ''}</p>
          <p><strong>Location:</strong> ${locationName}</p>
          <p>${party.location?.address || '2055 Beaver Ruin Road, Norcross, GA 30071'}</p>
        </div>
        <div style="margin: 20px 0;">
          <a href="${rsvpLink}" style="background: #6c5ce7; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">RSVP Now</a>
        </div>
        <p>Please <a href="${waiverLink}">sign the waiver</a> before attending. You'll need a copy at check-in to receive your birthday boost cards.</p>
      </div>
    `;

    const smsBody = `${hostName} has invited you to ${childName}'s birthday party at ${locationName} on ${partyDate}! RSVP: ${rsvpLink} Sign waiver: ${waiverLink}`;

    await this.notify({ partyId, email: invitation.guestEmail ?? undefined, phone: invitation.guestPhone ?? undefined, subject: `${hostName} has invited you to ${childName}'s birthday party!`, html, smsBody, type: 'GUEST_INVITED' });
  }

  // ──────────────────────────────────────────────────────────────
  // 14. GUEST INVITATION UPDATE
  // ──────────────────────────────────────────────────────────────

  async guestInvitationUpdated(partyId: string, invitationId: string) {
    const party = await this.getParty(partyId);
    const invitation = await this.prisma.invitation.findUnique({ where: { id: invitationId } });
    if (!party || !invitation) return;

    const guestName = invitation.guestName || 'Guest';
    const partyDate = party.partyDate?.toLocaleDateString('en-US') || '';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Invitation Updated</h2>
        <p>Dear ${guestName},</p>
        <p>The details for <strong>${party.childName || ''}'s</strong> event have been updated.</p>
        <p><strong>Date:</strong> ${partyDate}</p>
        <p><strong>Time:</strong> ${party.startTime || ''} - ${party.endTime || ''}</p>
        <p><a href="${this.frontendUrl}/rsvp/${invitationId}" style="color: #2563eb;">View updated invitation</a></p>
      </div>
    `;

    const smsBody = `Hi ${guestName}! The details for ${party.childName}'s event have been updated. Date: ${partyDate}. — Tiny Towne`;

    await this.notify({ partyId, email: invitation.guestEmail ?? undefined, phone: invitation.guestPhone ?? undefined, subject: `Invitation Updated - ${party.childName || ''}'s Party`, html, smsBody, type: 'GUEST_INVITATION_UPDATED' });
  }

  // ──────────────────────────────────────────────────────────────
  // 15. WAIVER SENT / WAIVER REMINDER
  // ──────────────────────────────────────────────────────────────

  async waiverSent(partyId: string, recipientEmail?: string, recipientPhone?: string, recipientName?: string) {
    const party = await this.getParty(partyId);
    if (!party) return;

    const name = recipientName || `${party.hostFirstName} ${party.hostLastName}`;
    const waiverLink = `${this.frontendUrl}/waiver/${partyId}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Waiver Required</h2>
        <p>Dear ${name},</p>
        <p>Please sign the waiver for <strong>${party.childName || ''}'s</strong> event at Tiny Towne.</p>
        <p>You must sign before attending and show a copy at check-in to receive your birthday boost cards.</p>
        <p><a href="${waiverLink}" style="background: #c46a2b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Sign Waiver</a></p>
      </div>
    `;

    const smsBody = `Hi ${name}! Please sign the waiver for the event at Tiny Towne: ${waiverLink} — You'll need it at check-in.`;

    await this.notify({ partyId, email: recipientEmail || party.hostEmail, phone: recipientPhone || party.hostPhone, subject: `Waiver Required - Tiny Towne Event`, html, smsBody, type: 'WAIVER_SENT' });
  }

  // ──────────────────────────────────────────────────────────────
  // 16. WAIVER SIGNED CONFIRMATION
  // ──────────────────────────────────────────────────────────────

  async waiverSigned(partyId: string, signerName: string, signerEmail?: string, signerPhone?: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60;">Waiver Signed</h2>
        <p>Dear ${signerName},</p>
        <p>Your waiver has been successfully signed. Please show this confirmation at check-in.</p>
        <p>Thank you,<br/>Tiny Towne</p>
      </div>
    `;

    const smsBody = `Hi ${signerName}! Your waiver has been signed successfully. Show this at check-in. — Tiny Towne`;

    await this.notify({ partyId, email: signerEmail, phone: signerPhone, subject: `Waiver Signed - Confirmation`, html, smsBody, type: 'WAIVER_SIGNED' });
  }

  // ──────────────────────────────────────────────────────────────
  // 17. ABANDONED CART / COME BACK (Template: CBE1, CBE2)
  // ──────────────────────────────────────────────────────────────

  async abandonedCartReminder(email: string, phone: string, hostName: string, completionUrl: string, stage: number) {
    const subject = stage === 1 ? 'Complete Your Booking!' : 'We Saved Your Spot!';

    const html = stage === 1
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Complete Your Booking!</h2>
          <p>Hi ${hostName},</p>
          <p>We noticed you started a booking but didn't finish. Your spot is still available!</p>
          <p><a href="${completionUrl}" style="background: #c46a2b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Complete Your Booking</a></p>
          <p>Thank you,<br/>Tiny Towne</p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>We Saved Your Spot!</h2>
          <p>Hi ${hostName},</p>
          <p>Your booking is still waiting for you! Don't miss out — complete it today.</p>
          <p><a href="${completionUrl}" style="background: #c46a2b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Finish Booking</a></p>
          <p>Thank you,<br/>Tiny Towne</p>
        </div>
      `;

    const smsBody = stage === 1
      ? `Hi ${hostName}! You started a booking at Tiny Towne but didn't finish. Complete it here: ${completionUrl}`
      : `Hi ${hostName}! Your spot at Tiny Towne is still saved. Finish your booking: ${completionUrl}`;

    await this.notify({ email, phone, subject, html, smsBody, type: `ABANDONED_CART_${stage}` });
  }

  // ──────────────────────────────────────────────────────────────
  // 18. INVOICE EMAIL (with PDF attachment)
  // ──────────────────────────────────────────────────────────────

  async invoiceEmail(partyId: string, pdfBuffer?: Buffer) {
    const party = await this.getParty(partyId);
    if (!party) return;

    const hostName = `${party.hostFirstName} ${party.hostLastName}`;
    const invoiceLink = `${this.frontendUrl}/invoice/${partyId}`;

    // Email with attachment handled separately via mail.service
    if (pdfBuffer) {
      try {
        await this.mail.sendEmailWithAttachment({
          to: party.hostEmail,
          subject: `Invoice - ${party.childName || hostName}'s Event`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Your Invoice</h2>
              <p>Dear ${hostName},</p>
              <p>Attached is the invoice for <strong>${party.childName || ''}'s</strong> event.</p>
              <p><a href="${invoiceLink}" style="color: #2563eb;">View online</a></p>
              <p>Thank you,<br/>Tiny Towne</p>
            </div>
          `,
          attachments: [{
            filename: `invoice-${partyId}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          }],
        });
      } catch (err) {
        this.logger.error(`Invoice email failed: ${err.message}`);
      }
    }

    // SMS (no attachment, just link)
    if (party.hostPhone) {
      await this.sms.sendSms({
        to: party.hostPhone,
        body: `Hi ${hostName}! Your invoice is ready. View it here: ${invoiceLink} — Tiny Towne`,
      });
    }
  }

  // ──────────────────────────────────────────────────────────────
  // 19. PASSWORD CHANGED
  // ──────────────────────────────────────────────────────────────

  async passwordChanged(email: string, userName: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Changed</h2>
        <p>Dear ${userName},</p>
        <p>Your password has been successfully changed. If you did not make this change, please contact us immediately at 404-944-4499.</p>
        <p>Thank you,<br/>Tiny Towne</p>
      </div>
    `;

    const smsBody = `Your Tiny Towne password has been changed. If this wasn't you, call 404-944-4499 immediately.`;

    await this.notify({ email, subject: 'Password Changed - Tiny Towne', html, smsBody, type: 'PASSWORD_CHANGED' });
  }

  // ──────────────────────────────────────────────────────────────
  // 20. TEAM MEMBER CREATED (Template: TMA)
  // ──────────────────────────────────────────────────────────────

  async teamMemberCreated(email: string, phone: string, memberName: string, role: string, tempPassword?: string) {
    const loginLink = `${this.frontendUrl}/login`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Tiny Towne!</h2>
        <p>Dear ${memberName},</p>
        <p>You've been added as a <strong>${role}</strong> on the Tiny Towne system.</p>
        ${tempPassword ? `<p>Your temporary password: <strong>${tempPassword}</strong></p>` : ''}
        <p><a href="${loginLink}" style="background: #c46a2b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Login Now</a></p>
        <p>Please change your password after your first login.</p>
      </div>
    `;

    const smsBody = `Hi ${memberName}! You've been added to Tiny Towne as ${role}. Login: ${loginLink}`;

    await this.notify({ email, phone, subject: 'Welcome to Tiny Towne - Account Created', html, smsBody, type: 'TEAM_MEMBER_CREATED' });
  }

  // ──────────────────────────────────────────────────────────────
  // 21. TEAM MEMBER REQUEST
  // ──────────────────────────────────────────────────────────────

  async teamMemberRequested(adminEmail: string, memberName: string, role: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Team Member Request</h2>
        <p>A new team member request has been submitted:</p>
        <p><strong>Name:</strong> ${memberName}</p>
        <p><strong>Role:</strong> ${role}</p>
        <p>Please log in to review and approve this request.</p>
      </div>
    `;

    await this.notify({ email: adminEmail, subject: `Team Member Request - ${memberName}`, html, smsBody: `New team member request: ${memberName} (${role}). Please review. — Tiny Towne`, type: 'TEAM_MEMBER_REQUESTED' });
  }

  // ──────────────────────────────────────────────────────────────
  // 22. ADDON UPDATED
  // ──────────────────────────────────────────────────────────────

  async addonUpdated(partyId: string) {
    const party = await this.getParty(partyId);
    if (!party) return;

    const hostName = `${party.hostFirstName} ${party.hostLastName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Add-Ons Updated</h2>
        <p>Dear ${hostName},</p>
        <p>The add-ons for <strong>${party.partyName || 'your event'}</strong> have been updated.</p>
        <p><a href="${this.frontendUrl}/booking/${partyId}" style="color: #2563eb;">View updated details</a></p>
        <p>Thank you,<br/>Tiny Towne</p>
      </div>
    `;

    const smsBody = `Hi ${hostName}! Your event add-ons have been updated. View: ${this.frontendUrl}/booking/${partyId} — Tiny Towne`;

    await this.notify({ partyId, email: party.hostEmail, phone: party.hostPhone, subject: `Add-Ons Updated - ${party.partyName || 'Your Event'}`, html, smsBody, type: 'ADDON_UPDATED' });
  }

  // ──────────────────────────────────────────────────────────────
  // 23-29. STAFF NOTIFICATIONS + MISC
  // ──────────────────────────────────────────────────────────────

  async notifyStaff(partyId: string, message: string) {
    // Find managers/admins for the party's location
    const party = await this.getParty(partyId);
    if (!party?.locationId) return;

    try {
      const location = await this.prisma.businessLocation.findUnique({
        where: { id: party.locationId },
        include: { business: true },
      });

      if (location?.business?.email) {
        await this.mail.sendEmail({
          to: location.business.email,
          subject: `Staff Notification - ${party.partyName || 'Event Update'}`,
          html: `<div style="font-family: Arial, sans-serif;"><h3>Staff Notification</h3><p>${message}</p></div>`,
        });
      }
    } catch (err) {
      this.logger.error(`Staff notification failed: ${err.message}`);
    }
  }

  async guestRsvpReceived(partyId: string, guestName: string, response: string) {
    const party = await this.getParty(partyId);
    if (!party) return;

    const hostName = `${party.hostFirstName} ${party.hostLastName}`;
    const statusText = response === 'yes' ? 'accepted' : 'declined';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>RSVP Received</h2>
        <p>Dear ${hostName},</p>
        <p><strong>${guestName}</strong> has <strong>${statusText}</strong> the invitation to ${party.childName || ''}'s party.</p>
        <p><a href="${this.frontendUrl}/booking/${partyId}" style="color: #2563eb;">View guest list</a></p>
      </div>
    `;

    const smsBody = `Hi ${hostName}! ${guestName} has ${statusText} the invitation to ${party.childName}'s party. — Tiny Towne`;

    await this.notify({ partyId, email: party.hostEmail, phone: party.hostPhone, subject: `RSVP: ${guestName} ${statusText}`, html, smsBody, type: 'GUEST_RSVP' });
  }

  async weeklyChargeReminder(partyId: string, amountDue: number) {
    return this.paymentRequested(partyId, amountDue);
  }

  async monthlyChargeReminder(partyId: string, amountDue: number) {
    return this.paymentRequested(partyId, amountDue);
  }
}
