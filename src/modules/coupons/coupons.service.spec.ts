import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CouponsService', () => {
  let service: CouponsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      coupon: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      couponPackage: { deleteMany: jest.fn(), createMany: jest.fn() },
      $transaction: jest.fn((fn) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CouponsService>(CouponsService);
  });

  describe('applyCoupon', () => {
    it('should validate a valid coupon', async () => {
      prisma.coupon.findFirst.mockResolvedValue({
        id: 'coup-1',
        code: 'SAVE10',
        type: 'PERCENTAGE',
        value: 10,
        isActive: true,
        maxUses: 100,
        usedCount: 5,
        validFrom: null,
        validUntil: null,
        couponPackages: [],
      });

      const result = await service.applyCoupon({
        locationId: 'loc-1',
        code: 'SAVE10',
      });

      expect(result.valid).toBe(true);
      expect(result.type).toBe('PERCENTAGE');
      expect(result.value).toBe(10);
    });

    it('should throw NotFoundException for invalid code', async () => {
      prisma.coupon.findFirst.mockResolvedValue(null);

      await expect(
        service.applyCoupon({ locationId: 'loc-1', code: 'INVALID' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for inactive coupon', async () => {
      prisma.coupon.findFirst.mockResolvedValue({
        id: 'coup-1',
        isActive: false,
        couponPackages: [],
      });

      await expect(
        service.applyCoupon({ locationId: 'loc-1', code: 'DISABLED' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when usage limit reached', async () => {
      prisma.coupon.findFirst.mockResolvedValue({
        id: 'coup-1',
        isActive: true,
        maxUses: 10,
        usedCount: 10,
        couponPackages: [],
      });

      await expect(
        service.applyCoupon({ locationId: 'loc-1', code: 'MAXED' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired coupon', async () => {
      prisma.coupon.findFirst.mockResolvedValue({
        id: 'coup-1',
        isActive: true,
        maxUses: null,
        usedCount: 0,
        validFrom: null,
        validUntil: new Date('2020-01-01'), // Expired
        couponPackages: [],
      });

      await expect(
        service.applyCoupon({ locationId: 'loc-1', code: 'EXPIRED' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for not-yet-valid coupon', async () => {
      prisma.coupon.findFirst.mockResolvedValue({
        id: 'coup-1',
        isActive: true,
        maxUses: null,
        usedCount: 0,
        validFrom: new Date('2030-01-01'), // Future
        validUntil: null,
        couponPackages: [],
      });

      await expect(
        service.applyCoupon({ locationId: 'loc-1', code: 'FUTURE' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for package-restricted coupon on wrong package', async () => {
      prisma.coupon.findFirst.mockResolvedValue({
        id: 'coup-1',
        isActive: true,
        maxUses: null,
        usedCount: 0,
        validFrom: null,
        validUntil: null,
        couponPackages: [{ packageId: 'pkg-1' }], // Only valid for pkg-1
      });

      await expect(
        service.applyCoupon({
          locationId: 'loc-1',
          code: 'PKG_ONLY',
          packageId: 'pkg-2', // Wrong package
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept package-restricted coupon for correct package', async () => {
      prisma.coupon.findFirst.mockResolvedValue({
        id: 'coup-1',
        code: 'PKG_ONLY',
        type: 'FIXED_AMOUNT',
        value: 25,
        isActive: true,
        maxUses: null,
        usedCount: 0,
        validFrom: null,
        validUntil: null,
        couponPackages: [{ packageId: 'pkg-1' }],
      });

      const result = await service.applyCoupon({
        locationId: 'loc-1',
        code: 'PKG_ONLY',
        packageId: 'pkg-1',
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('toggleStatus', () => {
    it('should toggle coupon active status', async () => {
      prisma.coupon.findUnique.mockResolvedValue({
        id: 'coup-1',
        isActive: true,
        couponPackages: [],
      });
      prisma.coupon.update.mockResolvedValue({
        id: 'coup-1',
        isActive: false,
      });

      const result = await service.toggleStatus('coup-1');
      expect(prisma.coupon.update).toHaveBeenCalledWith({
        where: { id: 'coup-1' },
        data: { isActive: false },
        select: { id: true, isActive: true },
      });
    });
  });
});
