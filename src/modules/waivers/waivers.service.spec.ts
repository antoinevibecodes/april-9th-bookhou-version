import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WaiversService } from './waivers.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('WaiversService', () => {
  let service: WaiversService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      party: { findUnique: jest.fn() },
      waiverTemplate: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      waiverQuestion: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      partyWaiver: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      invitation: { updateMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaiversService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<WaiversService>(WaiversService);
  });

  describe('signWaiver (Task #23: no login required)', () => {
    const signDto = {
      partyId: 'party-1',
      templateId: 'tmpl-1',
      signerName: 'Jane Guest',
      signerEmail: 'jane@example.com',
      signatureData: 'data:image/png;base64,...',
      answers: { allergies: 'None', emergency: 'John 555-1234' },
    };

    beforeEach(() => {
      prisma.party.findUnique.mockResolvedValue({ id: 'party-1' });
      prisma.partyWaiver.findFirst.mockResolvedValue(null);
      prisma.partyWaiver.create.mockImplementation(({ data }: any) => ({
        id: 'waiver-1',
        ...data,
      }));
      prisma.invitation.updateMany.mockResolvedValue({ count: 1 });
    });

    it('should create a waiver record for a guest', async () => {
      const result = await service.signWaiver(signDto);

      expect(result.signerName).toBe('Jane Guest');
      expect(result.status).toBe('SIGNED');
      expect(prisma.partyWaiver.create).toHaveBeenCalled();
    });

    it('should update invitation waiverSigned flag (Task #22)', async () => {
      await service.signWaiver(signDto);

      expect(prisma.invitation.updateMany).toHaveBeenCalledWith({
        where: { partyId: 'party-1', guestEmail: 'jane@example.com' },
        data: { waiverSigned: true },
      });
    });

    it('should allow host to sign even if email already used (Task #24)', async () => {
      // Existing signed waiver with same email
      prisma.partyWaiver.findFirst.mockResolvedValue({
        id: 'waiver-existing',
        signerEmail: 'host@example.com',
        status: 'SIGNED',
      });

      // Host signing should work (isHost = true)
      const result = await service.signWaiver({
        ...signDto,
        signerEmail: 'host@example.com',
        isHost: true,
      });

      expect(result).toBeDefined();
      expect(prisma.partyWaiver.create).toHaveBeenCalled();
    });

    it('should prevent duplicate guest waiver with same email (Task #24)', async () => {
      prisma.partyWaiver.findFirst.mockResolvedValue({
        id: 'waiver-existing',
        signerEmail: 'jane@example.com',
        status: 'SIGNED',
      });

      await expect(
        service.signWaiver({ ...signDto, isHost: false }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for invalid party', async () => {
      prisma.party.findUnique.mockResolvedValue(null);

      await expect(service.signWaiver(signDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle waiver with phone-only guest (no email)', async () => {
      const phoneDto = {
        ...signDto,
        signerEmail: undefined,
        signerPhone: '+14045551234',
      };

      const result = await service.signWaiver(phoneDto);

      expect(result.signerPhone).toBe('+14045551234');
      // Should update invitation by phone
      expect(prisma.invitation.updateMany).toHaveBeenCalledWith({
        where: { partyId: 'party-1', guestPhone: '+14045551234' },
        data: { waiverSigned: true },
      });
    });
  });

  describe('getWaiverForm (Task #23: public endpoint)', () => {
    it('should return waiver form for valid party', async () => {
      prisma.party.findUnique.mockResolvedValue({
        id: 'party-1',
        partyName: "Olivia's Birthday",
        partyDate: new Date('2024-08-15'),
        location: {
          name: 'Tiny Towne Atlanta',
          waiverTemplates: [
            {
              id: 'tmpl-1',
              name: 'Standard Waiver',
              content: '<p>Waiver text</p>',
              questions: [
                { id: 'q1', question: 'Allergies?', type: 'text' },
              ],
            },
          ],
        },
      });

      const result = await service.getWaiverForm('party-1');

      expect(result.partyName).toBe("Olivia's Birthday");
      expect(result.template.id).toBe('tmpl-1');
      expect(result.template.questions).toHaveLength(1);
    });

    it('should throw NotFoundException when no template configured', async () => {
      prisma.party.findUnique.mockResolvedValue({
        id: 'party-1',
        location: { waiverTemplates: [] },
      });

      await expect(service.getWaiverForm('party-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createTemplate', () => {
    it('should unset other defaults when creating a default template', async () => {
      prisma.waiverTemplate.create.mockResolvedValue({
        id: 'tmpl-new',
        isDefault: true,
      });
      prisma.waiverTemplate.updateMany.mockResolvedValue({ count: 1 });

      await service.createTemplate({
        locationId: 'loc-1',
        name: 'New Default',
        content: '<p>Content</p>',
        isDefault: true,
      });

      // Should have unset other defaults first
      expect(prisma.waiverTemplate.updateMany).toHaveBeenCalledWith({
        where: { locationId: 'loc-1', isDefault: true },
        data: { isDefault: false },
      });
    });
  });
});
