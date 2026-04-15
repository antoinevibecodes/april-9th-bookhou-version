import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../email/mail.service';
import { SmsService } from '../sms/sms.service';
import { SendInvitationsDto, RsvpDto } from './dto/invitations.dto';
import { formatLocalDate, formatLocalDateTime } from '../../common/helpers/timezone.helper';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private mailService: MailService,
    private smsService: SmsService,
  ) {}

  // Task #12, #16, #21: Send invitations via email or SMS
  async sendInvitations(dto: SendInvitationsDto) {
    const party = await this.prisma.party.findUnique({
      where: { id: dto.partyId },
      select: {
        id: true,
        partyName: true,
        childName: true,
        hostFirstName: true,
        hostLastName: true,
        partyDate: true,
        startTime: true,
        endTime: true,
        location: {
          select: { name: true, address: true, timezone: true },
        },
      },
    });
    if (!party) throw new NotFoundException('Party not found');

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'https://app.tinytowne.com');
    const hostName = `${party.hostFirstName} ${party.hostLastName}`;
    const partyDate = formatLocalDate(party.partyDate, party.location.timezone);
    const partyTime = `${party.startTime} - ${party.endTime}`;

    const results: { guestName: string; method: string; success: boolean; error?: string }[] = [];

    // Create all invitation records first
    const invitations = await this.prisma.invitation.createMany({
      data: dto.guests.map((g) => ({
        partyId: dto.partyId,
        guestName: g.guestName,
        guestEmail: g.guestEmail,
        guestPhone: g.guestPhone,
        method: g.method || (g.guestPhone ? 'SMS' : 'EMAIL'),
        sentAt: new Date(),
      })),
    });

    // Get created invitations for IDs (needed for RSVP/waiver links)
    const createdInvitations = await this.prisma.invitation.findMany({
      where: { partyId: dto.partyId },
      orderBy: { createdAt: 'desc' },
      take: dto.guests.length,
    });

    // Send each invitation via the appropriate channel
    for (const invitation of createdInvitations) {
      const rsvpLink = `${frontendUrl}/rsvp/${invitation.id}`;
      const waiverLink = `${frontendUrl}/waiver/${party.id}?guest=${encodeURIComponent(invitation.guestName)}`;

      try {
        if (
          invitation.method === 'EMAIL' ||
          invitation.method === 'BOTH'
        ) {
          if (invitation.guestEmail) {
            await this.mailService.sendInvitationEmail({
              to: invitation.guestEmail,
              hostName,
              childName: party.childName || party.partyName,
              partyName: party.partyName,
              partyDate,
              partyTime,
              locationName: party.location.name,
              locationAddress: party.location.address || '',
              rsvpLink,
              waiverLink,
            });
            results.push({
              guestName: invitation.guestName,
              method: 'EMAIL',
              success: true,
            });
          }
        }

        if (
          invitation.method === 'SMS' ||
          invitation.method === 'BOTH'
        ) {
          if (invitation.guestPhone) {
            const smsResult = await this.smsService.sendInvitationSms({
              to: invitation.guestPhone,
              hostName,
              childName: party.childName || party.partyName,
              partyName: party.partyName,
              partyDate,
              partyTime,
              locationName: party.location.name,
              rsvpLink,
              waiverLink,
            });
            results.push({
              guestName: invitation.guestName,
              method: 'SMS',
              success: smsResult.success,
              error: smsResult.error,
            });
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to send invitation to ${invitation.guestName}: ${error.message}`,
        );
        results.push({
          guestName: invitation.guestName,
          method: invitation.method,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      sent: invitations.count,
      results,
      message: `${invitations.count} invitation(s) processed`,
    };
  }

  async findByParty(partyId: string) {
    return this.prisma.invitation.findMany({
      where: { partyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // RSVP response (public endpoint - no auth required)
  // Task #22: When guest RSVPs YES, waiver status should be visible
  async rsvp(invitationId: string, dto: RsvpDto) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');

    const updated = await this.prisma.invitation.update({
      where: { id: invitationId },
      data: {
        rsvpStatus: dto.status,
        rsvpAt: new Date(),
      },
    });

    return {
      ...updated,
      waiverRequired: dto.status === 'YES' && !invitation.waiverSigned,
    };
  }

  // Resend invitation via original method
  async resend(invitationId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        party: {
          select: {
            id: true,
            partyName: true,
            childName: true,
            hostFirstName: true,
            hostLastName: true,
            partyDate: true,
            startTime: true,
            endTime: true,
            location: {
              select: { name: true, address: true, timezone: true },
            },
          },
        },
      },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');

    const party = invitation.party;
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'https://app.tinytowne.com');
    const hostName = `${party.hostFirstName} ${party.hostLastName}`;
    const partyDate = formatLocalDate(party.partyDate, party.location.timezone);
    const partyTime = `${party.startTime} - ${party.endTime}`;
    const rsvpLink = `${frontendUrl}/rsvp/${invitation.id}`;
    const waiverLink = `${frontendUrl}/waiver/${party.id}?guest=${encodeURIComponent(invitation.guestName)}`;

    if (
      (invitation.method === 'EMAIL' || invitation.method === 'BOTH') &&
      invitation.guestEmail
    ) {
      await this.mailService.sendInvitationEmail({
        to: invitation.guestEmail,
        hostName,
        childName: party.childName || party.partyName,
        partyName: party.partyName,
        partyDate,
        partyTime,
        locationName: party.location.name,
        locationAddress: party.location.address || '',
        rsvpLink,
        waiverLink,
      });
    }

    if (
      (invitation.method === 'SMS' || invitation.method === 'BOTH') &&
      invitation.guestPhone
    ) {
      await this.smsService.sendInvitationSms({
        to: invitation.guestPhone,
        hostName,
        childName: party.childName || party.partyName,
        partyName: party.partyName,
        partyDate,
        partyTime,
        locationName: party.location.name,
        rsvpLink,
        waiverLink,
      });
    }

    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { sentAt: new Date() },
    });

    return { message: 'Invitation resent', invitation };
  }

  async remove(invitationId: string) {
    await this.prisma.invitation.delete({ where: { id: invitationId } });
    return { message: 'Invitation removed' };
  }
}
