import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, calendar_v3 } from 'googleapis';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);
  private calendar: calendar_v3.Calendar | null = null;
  private calendarId: string;

  constructor(private config: ConfigService) {
    const clientEmail = this.config.get<string>('GOOGLE_CLIENT_EMAIL');
    const privateKey = this.config.get<string>('GOOGLE_PRIVATE_KEY');
    this.calendarId = this.config.get<string>(
      'GOOGLE_CALENDAR_ID',
      'primary',
    );

    if (clientEmail && privateKey && clientEmail !== 'placeholder' && privateKey !== 'placeholder') {
      const auth = new google.auth.JWT(
        clientEmail,
        undefined,
        // Replace escaped newlines from env var
        privateKey.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/calendar'],
      );

      this.calendar = google.calendar({ version: 'v3', auth });
      this.logger.log('Google Calendar client initialized');
    } else {
      this.logger.warn(
        'Google Calendar credentials not configured — calendar sync disabled',
      );
    }
  }

  // Create a calendar event when a party is booked
  async createEvent(params: {
    summary: string;
    description: string;
    location: string;
    startDateTime: string; // ISO 8601
    endDateTime: string; // ISO 8601
    timezone: string;
    attendeeEmail?: string;
    partyId: string;
  }): Promise<{ success: boolean; eventId?: string; error?: string }> {
    if (!this.calendar) {
      this.logger.warn('Calendar event not created (not configured)');
      return { success: false, error: 'Google Calendar not configured' };
    }

    try {
      const event: calendar_v3.Schema$Event = {
        summary: params.summary,
        description: params.description,
        location: params.location,
        start: {
          dateTime: params.startDateTime,
          timeZone: params.timezone,
        },
        end: {
          dateTime: params.endDateTime,
          timeZone: params.timezone,
        },
        // Store partyId in extended properties for lookup
        extendedProperties: {
          private: {
            partyId: params.partyId,
          },
        },
      };

      // Add attendee if email provided
      if (params.attendeeEmail) {
        event.attendees = [{ email: params.attendeeEmail }];
      }

      const response = await this.calendar.events.insert({
        calendarId: this.calendarId,
        requestBody: event,
      });

      this.logger.log(
        `Calendar event created: ${response.data.id} for party ${params.partyId}`,
      );
      return { success: true, eventId: response.data.id || undefined };
    } catch (error) {
      this.logger.error(`Calendar event creation failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Update a calendar event when party details change
  async updateEvent(
    eventId: string,
    params: {
      summary?: string;
      description?: string;
      location?: string;
      startDateTime?: string;
      endDateTime?: string;
      timezone?: string;
    },
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.calendar) {
      return { success: false, error: 'Google Calendar not configured' };
    }

    try {
      const event: calendar_v3.Schema$Event = {};

      if (params.summary) event.summary = params.summary;
      if (params.description) event.description = params.description;
      if (params.location) event.location = params.location;
      if (params.startDateTime) {
        event.start = {
          dateTime: params.startDateTime,
          timeZone: params.timezone,
        };
      }
      if (params.endDateTime) {
        event.end = {
          dateTime: params.endDateTime,
          timeZone: params.timezone,
        };
      }

      await this.calendar.events.patch({
        calendarId: this.calendarId,
        eventId,
        requestBody: event,
      });

      this.logger.log(`Calendar event updated: ${eventId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Calendar event update failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Cancel/delete calendar event when party is cancelled
  async deleteEvent(
    eventId: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.calendar) {
      return { success: false, error: 'Google Calendar not configured' };
    }

    try {
      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId,
      });

      this.logger.log(`Calendar event deleted: ${eventId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Calendar event deletion failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Find event by partyId using extended properties
  async findEventByPartyId(
    partyId: string,
  ): Promise<string | null> {
    if (!this.calendar) return null;

    try {
      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        privateExtendedProperty: [`partyId=${partyId}`],
        maxResults: 1,
      }) as any;

      const events = response.data?.items || [];
      return events.length > 0 ? events[0].id || null : null;
    } catch (error) {
      this.logger.error(`Calendar event lookup failed: ${error.message}`);
      return null;
    }
  }

  // Helper: Build event params from party data
  buildEventFromParty(party: {
    id: string;
    partyName: string;
    childName?: string;
    hostFirstName: string;
    hostLastName: string;
    hostEmail: string;
    hostPhone: string;
    partyDate: Date;
    startTime: string;
    endTime: string;
    guestCount: number;
    location: {
      name: string;
      address?: string;
      timezone: string;
    };
    package: {
      name: string;
    };
  }) {
    const dateStr = party.partyDate.toISOString().split('T')[0];

    return {
      summary: `${party.partyName} - ${party.package.name}`,
      description:
        `Host: ${party.hostFirstName} ${party.hostLastName}\n` +
        `Phone: ${party.hostPhone}\n` +
        `Email: ${party.hostEmail}\n` +
        (party.childName ? `Child: ${party.childName}\n` : '') +
        `Guests: ${party.guestCount}\n` +
        `Package: ${party.package.name}`,
      location: party.location.address
        ? `${party.location.name}, ${party.location.address}`
        : party.location.name,
      startDateTime: `${dateStr}T${party.startTime}:00`,
      endDateTime: `${dateStr}T${party.endTime}:00`,
      timezone: party.location.timezone,
      attendeeEmail: party.hostEmail,
      partyId: party.id,
    };
  }
}
