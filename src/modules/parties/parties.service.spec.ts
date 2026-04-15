import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PartiesService } from './parties.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CalendarService } from '../calendar/calendar.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('PartiesService', () => {
  let service: PartiesService;
  let prisma: any;
  let calendarService: any;

  beforeEach(async () => {
    prisma = {
      package: { findUnique: jest.fn() },
      businessLocation: { findUnique: jest.fn() },
      coupon: { findFirst: jest.fn(), update: jest.fn() },
      party: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      partyAddon: { deleteMany: jest.fn(), createMany: jest.fn() },
      partyNote: { create: jest.fn(), delete: jest.fn() },
      partyAssignment: { create: jest.fn(), delete: jest.fn() },
      offDay: { findFirst: jest.fn() },
      blockedTime: { findMany: jest.fn() },
    };

    calendarService = {
      buildEventFromParty: jest.fn().mockReturnValue({}),
      createEvent: jest.fn().mockResolvedValue({ success: true }),
      findEventByPartyId: jest.fn().mockResolvedValue(null),
      deleteEvent: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartiesService,
        { provide: PrismaService, useValue: prisma },
        { provide: CalendarService, useValue: calendarService },
      ],
    }).compile();

    service = module.get<PartiesService>(PartiesService);
  });

  describe('calculatePrice', () => {
    const mockPackage = {
      id: 'pkg-1',
      price: new Decimal(199.99),
      extraPerPersonPrice: new Decimal(12.99),
      maxGuests: 15,
    };

    const mockLocation = {
      id: 'loc-1',
      taxes: [{ rate: new Decimal(0.06) }], // 6% tax
    };

    beforeEach(() => {
      prisma.package.findUnique.mockResolvedValue(mockPackage);
      prisma.businessLocation.findUnique.mockResolvedValue(mockLocation);
    });

    it('should calculate basic price with tax', async () => {
      const result = await service.calculatePrice({
        packageId: 'pkg-1',
        locationId: 'loc-1',
        guestCount: 10,
      });

      expect(result.packagePrice).toBe(199.99);
      expect(result.extraPersonAmount).toBe(0); // 10 <= 15 maxGuests
      expect(result.subtotal).toBe(199.99);
      expect(result.taxAmount).toBe(12); // 199.99 * 0.06 = 11.9994 rounded
      expect(result.total).toBe(211.99); // 199.99 + 12
    });

    it('should calculate extra person pricing (Task #17: field trip)', async () => {
      const result = await service.calculatePrice({
        packageId: 'pkg-1',
        locationId: 'loc-1',
        guestCount: 20, // 5 extra guests
      });

      expect(result.extraPersonAmount).toBe(64.95); // 5 * 12.99
      expect(result.subtotal).toBe(264.94); // 199.99 + 64.95
    });

    it('should apply percentage coupon discount', async () => {
      prisma.coupon.findFirst.mockResolvedValue({
        id: 'coup-1',
        type: 'PERCENTAGE',
        value: new Decimal(10),
        isActive: true,
      });

      const result = await service.calculatePrice({
        packageId: 'pkg-1',
        locationId: 'loc-1',
        guestCount: 10,
        couponCode: 'SAVE10',
      });

      expect(result.discountAmount).toBeCloseTo(20, 0); // 10% of 199.99
      // Tax calculated on (subtotal - discount)
      expect(result.taxAmount).toBeCloseTo(10.8, 1); // (199.99 - 20) * 0.06
    });

    it('should apply fixed amount coupon', async () => {
      prisma.coupon.findFirst.mockResolvedValue({
        id: 'coup-1',
        type: 'FIXED_AMOUNT',
        value: new Decimal(25),
        isActive: true,
      });

      const result = await service.calculatePrice({
        packageId: 'pkg-1',
        locationId: 'loc-1',
        guestCount: 10,
        couponCode: 'SAVE25',
      });

      expect(result.discountAmount).toBe(25);
    });

    it('should apply full amount coupon', async () => {
      prisma.coupon.findFirst.mockResolvedValue({
        id: 'coup-1',
        type: 'FULL_AMOUNT',
        value: new Decimal(0),
        isActive: true,
      });

      const result = await service.calculatePrice({
        packageId: 'pkg-1',
        locationId: 'loc-1',
        guestCount: 10,
        couponCode: 'FREE',
      });

      expect(result.discountAmount).toBe(199.99);
      expect(result.total).toBe(0);
    });

    it('should include addon prices in total', async () => {
      const result = await service.calculatePrice({
        packageId: 'pkg-1',
        locationId: 'loc-1',
        guestCount: 10,
        addonPrices: [
          { price: 18.99, quantity: 2 },
          { price: 49.99, quantity: 1 },
        ],
      });

      expect(result.addonTotal).toBeCloseTo(87.97, 2); // 18.99*2 + 49.99
      expect(result.subtotal).toBeCloseTo(287.96, 2); // 199.99 + 87.97
    });

    it('should throw NotFoundException for invalid package', async () => {
      prisma.package.findUnique.mockResolvedValue(null);

      await expect(
        service.calculatePrice({
          packageId: 'invalid',
          locationId: 'loc-1',
          guestCount: 10,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle zero tax rate', async () => {
      prisma.businessLocation.findUnique.mockResolvedValue({
        id: 'loc-1',
        taxes: [], // No tax configured
      });

      const result = await service.calculatePrice({
        packageId: 'pkg-1',
        locationId: 'loc-1',
        guestCount: 10,
      });

      expect(result.taxRate).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.total).toBe(199.99);
    });
  });

  describe('cancel', () => {
    const mockParty = {
      id: 'party-1',
      status: 'ACTIVE',
      total: new Decimal(400),
      amountPaid: new Decimal(200),
      amountRefunded: new Decimal(0),
      packageId: 'pkg-1',
      guestCount: 10,
      packagePrice: new Decimal(349.99),
      addonTotal: new Decimal(50.01),
      discountAmount: new Decimal(0),
      taxRate: new Decimal(0.06),
      location: { timezone: 'America/New_York' },
      payments: [],
      package: { id: 'pkg-1', name: 'Test' },
      room: null,
      addons: [],
      invitations: [],
      waivers: [],
      notes: [],
      assignments: [],
      emailLogs: [],
    };

    beforeEach(() => {
      prisma.party.findUnique.mockResolvedValue(mockParty);
    });

    it('should cancel with percentage refund (Task #7)', async () => {
      prisma.party.update.mockResolvedValue({ ...mockParty, status: 'CANCELLED' });

      await service.cancel('party-1', {
        refundType: 'PERCENTAGE',
        refundValue: 50, // 50% refund
        reason: 'Customer request',
      });

      const updateCall = prisma.party.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe('CANCELLED');
      expect(updateCall.data.cancellationRefundType).toBe('PERCENTAGE');
      // Refund = 200 * 50% = 100
      expect(updateCall.data.amountRefunded.increment.toString()).toBe('100');
    });

    it('should cancel with fixed fee (Task #7)', async () => {
      prisma.party.update.mockResolvedValue({ ...mockParty, status: 'CANCELLED' });

      await service.cancel('party-1', {
        refundType: 'FIXED_AMOUNT',
        refundValue: 50, // $50 cancellation fee
        reason: 'Customer request',
      });

      const updateCall = prisma.party.update.mock.calls[0][0];
      // Refund = amountPaid - fee = 200 - 50 = 150
      expect(updateCall.data.amountRefunded.increment.toString()).toBe('150');
      expect(updateCall.data.cancellationFee).toBe(50);
    });

    it('should not refund more than paid when fee exceeds payment', async () => {
      prisma.party.update.mockResolvedValue({ ...mockParty, status: 'CANCELLED' });

      await service.cancel('party-1', {
        refundType: 'FIXED_AMOUNT',
        refundValue: 300, // Fee > amountPaid
        reason: 'No show',
      });

      const updateCall = prisma.party.update.mock.calls[0][0];
      // Refund = max(0, 200 - 300) = 0
      expect(updateCall.data.amountRefunded.increment.toString()).toBe('0');
    });

    it('should throw BadRequestException if already cancelled', async () => {
      prisma.party.findUnique.mockResolvedValue({ ...mockParty, status: 'CANCELLED' });

      await expect(
        service.cancel('party-1', {
          refundType: 'PERCENTAGE',
          refundValue: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkAvailability', () => {
    it('should return available when no conflicts', async () => {
      prisma.offDay.findFirst.mockResolvedValue(null);
      prisma.party.findMany.mockResolvedValue([]);
      prisma.blockedTime.findMany.mockResolvedValue([]);

      const result = await service.checkAvailability(
        'loc-1',
        '2024-08-15',
        '14:00',
        '16:00',
      );

      expect(result.available).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should return unavailable on off day', async () => {
      prisma.offDay.findFirst.mockResolvedValue({
        reason: 'Holiday',
      });

      const result = await service.checkAvailability(
        'loc-1',
        '2024-12-25',
        '14:00',
        '16:00',
      );

      expect(result.available).toBe(false);
      expect(result.reason).toContain('Holiday');
    });

    it('should return unavailable when conflicting booking exists', async () => {
      prisma.offDay.findFirst.mockResolvedValue(null);
      prisma.party.findMany.mockResolvedValue([
        { id: 'conflict-1', partyName: 'Other Party', startTime: '13:00', endTime: '15:00' },
      ]);
      prisma.blockedTime.findMany.mockResolvedValue([]);

      const result = await service.checkAvailability(
        'loc-1',
        '2024-08-15',
        '14:00',
        '16:00',
      );

      expect(result.available).toBe(false);
      expect(result.conflicts).toHaveLength(1);
    });
  });
});
