import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const twilio = require('twilio');

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: any = null;
  private fromNumber: string;

  constructor(private config: ConfigService) {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.config.get<string>('TWILIO_PHONE_NUMBER', '');

    if (accountSid && authToken && accountSid !== 'placeholder' && authToken !== 'placeholder') {
      this.client = twilio(accountSid, authToken);
      this.logger.log('Twilio SMS client initialized');
    } else {
      this.logger.warn(
        'Twilio credentials not configured — SMS sending disabled',
      );
    }
  }

  async sendSms(params: { to: string; body: string }): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    if (!this.client) {
      this.logger.warn('SMS not sent (Twilio not configured): ' + params.to);
      return { success: false, error: 'Twilio not configured' };
    }

    try {
      const message = await this.client.messages.create({
        body: params.body,
        from: this.fromNumber,
        to: params.to,
      });

      this.logger.log(`SMS sent to ${params.to}: ${message.sid}`);
      return { success: true, messageId: message.sid };
    } catch (error) {
      this.logger.error(`SMS failed to ${params.to}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Task #12: Send party invitation via SMS
  async sendInvitationSms(params: {
    to: string;
    hostName: string;
    childName: string;
    partyName: string;
    partyDate: string;
    partyTime: string;
    locationName: string;
    rsvpLink: string;
    waiverLink: string;
  }) {
    // Task #21: Proper invitation wording
    const body =
      `${params.hostName} has invited you to ${params.childName}'s birthday party!\n\n` +
      `Event: ${params.partyName}\n` +
      `Date: ${params.partyDate}\n` +
      `Time: ${params.partyTime}\n` +
      `Location: ${params.locationName}\n\n` +
      `RSVP: ${params.rsvpLink}\n` +
      `Sign Waiver: ${params.waiverLink}`;

    return this.sendSms({ to: params.to, body });
  }

  // Send waiver reminder via SMS
  async sendWaiverReminderSms(params: {
    to: string;
    guestName: string;
    partyName: string;
    waiverLink: string;
  }) {
    const body =
      `Hi ${params.guestName}! Reminder: Please sign the waiver for ${params.partyName} before attending.\n\n` +
      `Sign here: ${params.waiverLink}`;

    return this.sendSms({ to: params.to, body });
  }

  // Send booking confirmation via SMS
  async sendBookingConfirmationSms(params: {
    to: string;
    hostName: string;
    partyName: string;
    partyDate: string;
    partyTime: string;
    bookingLink: string;
  }) {
    const body =
      `Hi ${params.hostName}! Your booking for ${params.partyName} is confirmed.\n\n` +
      `Date: ${params.partyDate}\n` +
      `Time: ${params.partyTime}\n\n` +
      `View details: ${params.bookingLink}`;

    return this.sendSms({ to: params.to, body });
  }
}
