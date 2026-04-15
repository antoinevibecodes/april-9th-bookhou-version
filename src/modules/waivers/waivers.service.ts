import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateWaiverTemplateDto,
  UpdateWaiverTemplateDto,
  WaiverQuestionDto,
  SignWaiverDto,
} from './dto/waivers.dto';

@Injectable()
export class WaiversService {
  private readonly logger = new Logger(WaiversService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ── Templates ──────────────────────────────────────────────

  async createTemplate(dto: CreateWaiverTemplateDto) {
    if (dto.isDefault) {
      await this.prisma.waiverTemplate.updateMany({
        where: { locationId: dto.locationId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.waiverTemplate.create({
      data: dto,
      include: { questions: true },
    });
  }

  async findTemplates(locationId: string) {
    return this.prisma.waiverTemplate.findMany({
      where: { locationId },
      include: { questions: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findTemplate(id: string) {
    const template = await this.prisma.waiverTemplate.findUnique({
      where: { id },
      include: { questions: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!template) throw new NotFoundException('Waiver template not found');
    return template;
  }

  async updateTemplate(id: string, dto: UpdateWaiverTemplateDto) {
    await this.findTemplate(id);
    return this.prisma.waiverTemplate.update({
      where: { id },
      data: dto,
      include: { questions: true },
    });
  }

  async deleteTemplate(id: string) {
    await this.findTemplate(id);
    await this.prisma.waiverTemplate.delete({ where: { id } });
    return { message: 'Waiver template deleted' };
  }

  // ── Questions ──────────────────────────────────────────────

  async addQuestion(templateId: string, dto: WaiverQuestionDto) {
    const count = await this.prisma.waiverQuestion.count({ where: { templateId } });
    return this.prisma.waiverQuestion.create({
      data: { templateId, ...dto, sortOrder: count },
    });
  }

  async updateQuestion(questionId: string, dto: Partial<WaiverQuestionDto>) {
    return this.prisma.waiverQuestion.update({
      where: { id: questionId },
      data: dto,
    });
  }

  async deleteQuestion(questionId: string) {
    await this.prisma.waiverQuestion.delete({ where: { id: questionId } });
    return { message: 'Question deleted' };
  }

  // ── Signing (Public - Task #23: no login required) ─────────

  async signWaiver(dto: SignWaiverDto) {
    const party = await this.prisma.party.findUnique({ where: { id: dto.partyId } });
    if (!party) throw new NotFoundException('Party not found');

    // Task #23: Prevent host waiver from being overwritten by guest
    // Each signer gets their own waiver record
    const existingByEmail = dto.signerEmail
      ? await this.prisma.partyWaiver.findFirst({
          where: { partyId: dto.partyId, signerEmail: dto.signerEmail, status: 'SIGNED' },
        })
      : null;

    if (existingByEmail && !dto.isHost) {
      throw new BadRequestException(
        'A waiver has already been signed with this email. Each guest must sign their own waiver.',
      );
    }

    const waiver = await this.prisma.partyWaiver.create({
      data: {
        partyId: dto.partyId,
        templateId: dto.templateId,
        signerName: dto.signerName,
        signerEmail: dto.signerEmail,
        signerPhone: dto.signerPhone,
        signatureData: dto.signatureData,
        answers: dto.answers,
        isHost: dto.isHost ?? false,
        minors: dto.minors as any,
        status: 'SIGNED',
        signedAt: new Date(),
      },
    });

    // Task #22: Update invitation waiver status if guest RSVP'd
    if (dto.signerEmail) {
      await this.prisma.invitation.updateMany({
        where: {
          partyId: dto.partyId,
          guestEmail: dto.signerEmail,
        },
        data: { waiverSigned: true },
      });
    }
    if (dto.signerPhone) {
      await this.prisma.invitation.updateMany({
        where: {
          partyId: dto.partyId,
          guestPhone: dto.signerPhone,
        },
        data: { waiverSigned: true },
      });
    }

    // Send waiver signed confirmation (fire-and-forget)
    this.notifications.waiverSigned(
      dto.partyId,
      dto.signerName,
      dto.signerEmail,
      dto.signerPhone,
    ).catch((err) => this.logger.warn(`Waiver notification failed: ${err.message}`));

    return waiver;
  }

  // Get waivers for a party (includes signed status for admin/employee view)
  async getPartyWaivers(partyId: string) {
    return this.prisma.partyWaiver.findMany({
      where: { partyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get signed waivers list
  async getSignedWaivers(locationId: string) {
    return this.prisma.partyWaiver.findMany({
      where: {
        party: { locationId },
        status: 'SIGNED',
      },
      include: {
        party: { select: { id: true, partyName: true, partyDate: true } },
      },
      orderBy: { signedAt: 'desc' },
    });
  }

  // Get unsigned waivers (guests who RSVP'd YES but haven't signed)
  async getUnsignedWaivers(locationId: string) {
    return this.prisma.invitation.findMany({
      where: {
        party: { locationId },
        rsvpStatus: 'YES',
        waiverSigned: false,
      },
      include: {
        party: { select: { id: true, partyName: true, partyDate: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Task #23: Get waiver form for a specific party (public, no auth)
  async getWaiverForm(partyId: string) {
    const party = await this.prisma.party.findUnique({
      where: { id: partyId },
      include: {
        location: {
          include: {
            waiverTemplates: {
              where: { isDefault: true, isActive: true },
              include: { questions: { orderBy: { sortOrder: 'asc' } } },
              take: 1,
            },
          },
        },
      },
    });
    if (!party) throw new NotFoundException('Party not found');

    const template = party.location?.waiverTemplates[0];
    if (!template) throw new NotFoundException('No waiver template configured for this location');

    return {
      partyId: party.id,
      partyName: party.partyName,
      partyDate: party.partyDate,
      locationName: party.location?.name,
      template: {
        id: template.id,
        name: template.name,
        content: template.content,
        questions: template.questions,
      },
    };
  }
}
