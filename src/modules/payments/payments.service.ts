import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePaymentDto,
  CreateTipDto,
  RefundPaymentDto,
  TransactionFilterDto,
} from './dto/payments.dto';
import { formatLocalDateTime } from '../../common/helpers/timezone.helper';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  // Record a payment
  async createPayment(dto: CreatePaymentDto, processedBy?: string) {
    const party = await this.prisma.party.findUnique({
      where: { id: dto.partyId },
      include: { location: { select: { timezone: true } } },
    });
    if (!party) throw new NotFoundException('Party not found');

    const payment = await this.prisma.payment.create({
      data: {
        partyId: dto.partyId,
        amount: dto.amount,
        type: dto.type,
        status: dto.status || 'PAID',
        note: dto.note,
        cardLast4: dto.cardLast4,
        cardholderName: dto.cardholderName,
        cardBrand: dto.cardBrand,
        stripePaymentId: dto.stripePaymentId,
        squarePaymentId: dto.squarePaymentId,
        processedBy,
      },
    });

    // Update party amountPaid and balance
    if (dto.status !== 'REFUND') {
      await this.prisma.party.update({
        where: { id: dto.partyId },
        data: {
          amountPaid: { increment: dto.amount },
          balance: { decrement: dto.amount },
        },
      });
    }

    return payment;
  }

  // Record a tip
  async createTip(dto: CreateTipDto, processedBy?: string) {
    return this.prisma.payment.create({
      data: {
        partyId: dto.partyId,
        amount: dto.amount,
        type: dto.type,
        status: 'TIP',
        note: dto.note,
        processedBy,
      },
    });
  }

  // Task #6, #8, #9: Full refund process with proper tracking
  async refundPayment(dto: RefundPaymentDto, processedBy?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
      include: { party: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    if (payment.status === 'REFUND') {
      throw new BadRequestException('Payment already refunded');
    }

    const refundAmount = new Decimal(dto.amount);
    const originalAmount = new Decimal(payment.amount);
    const alreadyRefunded = payment.refundedAmount ? new Decimal(payment.refundedAmount) : new Decimal(0);

    if (refundAmount.add(alreadyRefunded).gt(originalAmount)) {
      throw new BadRequestException('Refund amount exceeds payment amount');
    }

    // Update the payment record
    const updatedPayment = await this.prisma.payment.update({
      where: { id: dto.paymentId },
      data: {
        refundedAmount: { increment: dto.amount },
        refundedAt: new Date(),
        refundReason: dto.reason,
        status: refundAmount.add(alreadyRefunded).eq(originalAmount) ? 'REFUND' : 'PAID',
      },
    });

    // Create a refund transaction record for visibility (Task #9)
    await this.prisma.payment.create({
      data: {
        partyId: payment.partyId,
        amount: dto.amount,
        type: payment.type,
        status: 'REFUND',
        note: dto.reason || `Refund for payment ${payment.id}`,
        cardLast4: payment.cardLast4,
        cardholderName: payment.cardholderName,
        stripePaymentId: payment.stripePaymentId,
        squarePaymentId: payment.squarePaymentId,
        processedBy,
      },
    });

    // Task #8: Update party amountRefunded and balance
    await this.prisma.party.update({
      where: { id: payment.partyId },
      data: {
        amountRefunded: { increment: dto.amount },
        amountPaid: { decrement: dto.amount },
        balance: { increment: dto.amount },
      },
    });

    return updatedPayment;
  }

  // Check refundable amount for a party
  async checkRefundAmount(partyId: string) {
    const party = await this.prisma.party.findUnique({ where: { id: partyId } });
    if (!party) throw new NotFoundException('Party not found');

    return {
      totalPaid: party.amountPaid,
      totalRefunded: party.amountRefunded,
      refundable: new Decimal(party.amountPaid).sub(party.amountRefunded),
    };
  }

  // Task #2: Transaction listing with filters (Today/Yesterday/date range, payment type)
  async findTransactions(filters: TransactionFilterDto) {
    const { locationId, dateFilter, dateFrom, dateTo, paymentType, status, search, page = 1, limit = 20 } = filters;

    const where: any = {};

    // Filter by location through party
    if (locationId) {
      where.party = { locationId };
    }

    // Task #2: Date filters (Today/Yesterday/custom range)
    if (dateFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      where.processedAt = { gte: today, lt: tomorrow };
    } else if (dateFilter === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.processedAt = { gte: yesterday, lt: today };
    } else if (dateFrom || dateTo) {
      where.processedAt = {};
      if (dateFrom) where.processedAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        where.processedAt.lte = end;
      }
    }

    // Task #2: Payment type filter (All/Cash/Card + Apple Pay, Cash App, etc.)
    if (paymentType && paymentType !== 'all') {
      where.type = paymentType;
    }

    if (status) where.status = status;

    if (search) {
      where.OR = [
        { note: { contains: search, mode: 'insensitive' } },
        { cardholderName: { contains: search, mode: 'insensitive' } },
        { party: { partyName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [transactions, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          party: {
            select: {
              id: true,
              partyName: true,
              partyDate: true,
              hostFirstName: true,
              hostLastName: true,
              location: { select: { id: true, name: true, timezone: true } },
            },
          },
        },
        orderBy: { processedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    // Task #1: Format dates in local timezone
    const formattedTransactions = transactions.map((t) => {
      const tz = t.party?.location?.timezone || 'America/New_York';
      return {
        ...t,
        processedAtLocal: formatLocalDateTime(t.processedAt, tz),
        createdAtLocal: formatLocalDateTime(t.createdAt, tz),
      };
    });

    // Task #3: Calculate totals
    const totals = await this.prisma.payment.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
    });

    // Separate totals by status
    const paidTotal = await this.prisma.payment.aggregate({
      where: { ...where, status: 'PAID' },
      _sum: { amount: true },
    });

    const refundTotal = await this.prisma.payment.aggregate({
      where: { ...where, status: 'REFUND' },
      _sum: { amount: true },
    });

    const tipTotal = await this.prisma.payment.aggregate({
      where: { ...where, status: 'TIP' },
      _sum: { amount: true },
    });

    return {
      data: formattedTransactions,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      totals: {
        all: totals._sum.amount || 0,
        paid: paidTotal._sum.amount || 0,
        refunds: refundTotal._sum.amount || 0,
        tips: tipTotal._sum.amount || 0,
        count: totals._count,
      },
    };
  }

  // Get payment history for a specific party
  async getPartyPayments(partyId: string) {
    const party = await this.prisma.party.findUnique({
      where: { id: partyId },
      include: { location: { select: { timezone: true } } },
    });
    if (!party) throw new NotFoundException('Party not found');

    const payments = await this.prisma.payment.findMany({
      where: { partyId },
      orderBy: { createdAt: 'desc' },
    });

    const tz = party.location?.timezone || 'America/New_York';

    return payments.map((p) => ({
      ...p,
      processedAtLocal: formatLocalDateTime(p.processedAt, tz),
    }));
  }
}
