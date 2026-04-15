import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      party: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('createPayment', () => {
    it('should create a payment and update party balance', async () => {
      prisma.party.findUnique.mockResolvedValue({
        id: 'party-1',
        location: { timezone: 'America/New_York' },
      });
      prisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        partyId: 'party-1',
        amount: 100,
        type: 'CARD',
        status: 'PAID',
      });
      prisma.party.update.mockResolvedValue({});

      const result = await service.createPayment({
        partyId: 'party-1',
        amount: 100,
        type: 'CARD' as any,
      });

      expect(result.id).toBe('pay-1');
      expect(prisma.party.update).toHaveBeenCalledWith({
        where: { id: 'party-1' },
        data: {
          amountPaid: { increment: 100 },
          balance: { decrement: 100 },
        },
      });
    });

    it('should store card details (Task #13)', async () => {
      prisma.party.findUnique.mockResolvedValue({
        id: 'party-1',
        location: { timezone: 'America/New_York' },
      });
      prisma.payment.create.mockResolvedValue({ id: 'pay-1' });
      prisma.party.update.mockResolvedValue({});

      await service.createPayment({
        partyId: 'party-1',
        amount: 200,
        type: 'CARD' as any,
        cardLast4: '4242',
        cardholderName: 'John Doe',
        cardBrand: 'visa',
      });

      const createCall = prisma.payment.create.mock.calls[0][0];
      expect(createCall.data.cardLast4).toBe('4242');
      expect(createCall.data.cardholderName).toBe('John Doe');
      expect(createCall.data.cardBrand).toBe('visa');
    });

    it('should not update balance for refund-type payments', async () => {
      prisma.party.findUnique.mockResolvedValue({
        id: 'party-1',
        location: { timezone: 'America/New_York' },
      });
      prisma.payment.create.mockResolvedValue({ id: 'pay-1' });

      await service.createPayment({
        partyId: 'party-1',
        amount: 50,
        type: 'CARD' as any,
        status: 'REFUND' as any,
      });

      expect(prisma.party.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for invalid party', async () => {
      prisma.party.findUnique.mockResolvedValue(null);

      await expect(
        service.createPayment({
          partyId: 'invalid',
          amount: 100,
          type: 'CASH' as any,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('refundPayment', () => {
    const mockPayment = {
      id: 'pay-1',
      partyId: 'party-1',
      amount: new Decimal(200),
      type: 'CARD',
      status: 'PAID',
      refundedAmount: null,
      cardLast4: '4242',
      cardholderName: 'Jane',
      stripePaymentId: 'pi_123',
      squarePaymentId: null,
      party: { id: 'party-1' },
    };

    it('should process full refund (Task #5)', async () => {
      prisma.payment.findUnique.mockResolvedValue(mockPayment);
      prisma.payment.update.mockResolvedValue({ ...mockPayment, status: 'REFUND' });
      prisma.payment.create.mockResolvedValue({});
      prisma.party.update.mockResolvedValue({});

      const result = await service.refundPayment({
        paymentId: 'pay-1',
        amount: 200,
        reason: 'Customer cancelled',
      });

      // Should mark original as REFUND (full amount)
      const updateCall = prisma.payment.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe('REFUND');

      // Should create refund transaction record (Task #9)
      expect(prisma.payment.create).toHaveBeenCalled();
      const createCall = prisma.payment.create.mock.calls[0][0];
      expect(createCall.data.status).toBe('REFUND');
      expect(createCall.data.amount).toBe(200);

      // Task #8: Should update party refund tracking
      expect(prisma.party.update).toHaveBeenCalledWith({
        where: { id: 'party-1' },
        data: {
          amountRefunded: { increment: 200 },
          amountPaid: { decrement: 200 },
          balance: { increment: 200 },
        },
      });
    });

    it('should process partial refund', async () => {
      prisma.payment.findUnique.mockResolvedValue(mockPayment);
      prisma.payment.update.mockResolvedValue({ ...mockPayment });
      prisma.payment.create.mockResolvedValue({});
      prisma.party.update.mockResolvedValue({});

      await service.refundPayment({
        paymentId: 'pay-1',
        amount: 50,
        reason: 'Partial refund',
      });

      const updateCall = prisma.payment.update.mock.calls[0][0];
      // Partial: 50 < 200, so status stays PAID
      expect(updateCall.data.status).toBe('PAID');
    });

    it('should throw if refund exceeds payment amount', async () => {
      prisma.payment.findUnique.mockResolvedValue(mockPayment);

      await expect(
        service.refundPayment({
          paymentId: 'pay-1',
          amount: 300,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if payment already refunded', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        status: 'REFUND',
      });

      await expect(
        service.refundPayment({ paymentId: 'pay-1', amount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findTransactions', () => {
    it('should filter by date range (Task #2)', async () => {
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.payment.count.mockResolvedValue(0);
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null }, _count: 0 });

      await service.findTransactions({
        locationId: 'loc-1',
        dateFilter: 'today',
      });

      const findCall = prisma.payment.findMany.mock.calls[0][0];
      expect(findCall.where.processedAt).toBeDefined();
      expect(findCall.where.processedAt.gte).toBeDefined();
      expect(findCall.where.processedAt.lt).toBeDefined();
    });

    it('should filter by payment type (Task #2)', async () => {
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.payment.count.mockResolvedValue(0);
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null }, _count: 0 });

      await service.findTransactions({
        locationId: 'loc-1',
        paymentType: 'CASH',
      });

      const findCall = prisma.payment.findMany.mock.calls[0][0];
      expect(findCall.where.type).toBe('CASH');
    });

    it('should not filter by type when "all" is selected', async () => {
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.payment.count.mockResolvedValue(0);
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null }, _count: 0 });

      await service.findTransactions({
        locationId: 'loc-1',
        paymentType: 'all',
      });

      const findCall = prisma.payment.findMany.mock.calls[0][0];
      expect(findCall.where.type).toBeUndefined();
    });
  });
});
