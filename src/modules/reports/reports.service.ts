import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { formatLocalDateTime } from '../../common/helpers/timezone.helper';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // Task #3: Reports with totals, filtered by date range and payment type
  // Task #7: Total birthdays booked, filter by packages, total addons, etc.
  // Task #20: Total collected tax for IRS reconciliation
  async getPaymentReport(params: {
    locationId: string;
    dateFrom?: string;
    dateTo?: string;
    paymentType?: string;
    teamMemberId?: string;
  }) {
    const location = await this.prisma.businessLocation.findUnique({
      where: { id: params.locationId },
      select: { timezone: true },
    });
    if (!location) throw new NotFoundException('Location not found');

    const where: any = { party: { locationId: params.locationId } };

    if (params.dateFrom || params.dateTo) {
      where.processedAt = {};
      if (params.dateFrom) where.processedAt.gte = new Date(params.dateFrom);
      if (params.dateTo) {
        const end = new Date(params.dateTo);
        end.setHours(23, 59, 59, 999);
        where.processedAt.lte = end;
      }
    }

    if (params.paymentType && params.paymentType !== 'all') {
      where.type = params.paymentType;
    }

    if (params.teamMemberId) {
      where.processedBy = params.teamMemberId;
    }

    const payments = await this.prisma.payment.findMany({
      where,
      include: {
        party: {
          select: {
            id: true,
            partyName: true,
            partyDate: true,
            hostFirstName: true,
            hostLastName: true,
          },
        },
      },
      orderBy: { processedAt: 'desc' },
    });

    // Task #3: Calculate totals (was missing in old code)
    const totals = {
      totalPaid: 0,
      totalRefunds: 0,
      totalTips: 0,
      totalCash: 0,
      totalCard: 0,
      totalApplePay: 0,
      totalCashApp: 0,
      totalSquareOther: 0,
      netRevenue: 0,
      count: payments.length,
    };

    for (const p of payments) {
      const amount = Number(p.amount);
      if (p.status === 'PAID') {
        totals.totalPaid += amount;
        if (p.type === 'CASH') totals.totalCash += amount;
        else if (p.type === 'CARD') totals.totalCard += amount;
        else if (p.type === 'APPLE_PAY') totals.totalApplePay += amount;
        else if (p.type === 'CASH_APP') totals.totalCashApp += amount;
        else if (p.type === 'SQUARE_OTHER') totals.totalSquareOther += amount;
      } else if (p.status === 'REFUND') {
        totals.totalRefunds += amount;
      } else if (p.status === 'TIP') {
        totals.totalTips += amount;
      }
    }
    totals.netRevenue = totals.totalPaid - totals.totalRefunds;

    // Task #1: Format in local timezone
    const formattedPayments = payments.map((p) => ({
      ...p,
      processedAtLocal: formatLocalDateTime(p.processedAt, location.timezone),
      note: p.note, // Task #3: Notes shown next to each payment
    }));

    return { data: formattedPayments, totals };
  }

  // Task #7: Party/booking reports
  async getPartyReport(params: {
    locationId: string;
    dateFrom?: string;
    dateTo?: string;
    packageId?: string;
    eventType?: string;
  }) {
    const where: any = { locationId: params.locationId };

    if (params.dateFrom || params.dateTo) {
      where.partyDate = {};
      if (params.dateFrom) where.partyDate.gte = new Date(params.dateFrom);
      if (params.dateTo) where.partyDate.lte = new Date(params.dateTo);
    }
    if (params.packageId) where.packageId = params.packageId;
    if (params.eventType) where.eventType = params.eventType;

    const parties = await this.prisma.party.findMany({
      where,
      include: {
        package: { select: { id: true, name: true } },
        addons: { include: { addon: { select: { name: true } } } },
      },
      orderBy: { partyDate: 'desc' },
    });

    // Aggregate stats
    const totalParties = parties.length;
    const totalRevenue = parties.reduce((sum, p) => sum + Number(p.total), 0);
    const totalAddons = parties.reduce((sum, p) => sum + Number(p.addonTotal), 0);

    // Group by package
    const byPackage: Record<string, { count: number; revenue: number; name: string }> = {};
    for (const p of parties) {
      const pkgName = p.package?.name || 'Unknown';
      if (!byPackage[pkgName]) byPackage[pkgName] = { count: 0, revenue: 0, name: pkgName };
      byPackage[pkgName].count++;
      byPackage[pkgName].revenue += Number(p.total);
    }

    // Group by status
    const byStatus: Record<string, number> = {};
    for (const p of parties) {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    }

    return {
      data: parties,
      summary: {
        totalParties,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalAddons: Math.round(totalAddons * 100) / 100,
        byPackage: Object.values(byPackage),
        byStatus,
      },
    };
  }

  // Task #20: Tax report for IRS reconciliation
  async getTaxReport(params: {
    locationId: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const where: any = { locationId: params.locationId };

    if (params.dateFrom || params.dateTo) {
      where.partyDate = {};
      if (params.dateFrom) where.partyDate.gte = new Date(params.dateFrom);
      if (params.dateTo) where.partyDate.lte = new Date(params.dateTo);
    }

    const parties = await this.prisma.party.findMany({
      where,
      select: {
        id: true,
        partyName: true,
        partyDate: true,
        subtotal: true,
        taxRate: true,
        taxAmount: true,
        total: true,
        status: true,
      },
      orderBy: { partyDate: 'desc' },
    });

    const totalTaxCollected = parties.reduce((sum, p) => sum + Number(p.taxAmount), 0);
    const totalTaxableAmount = parties.reduce((sum, p) => sum + Number(p.subtotal), 0);

    return {
      data: parties,
      summary: {
        totalTaxCollected: Math.round(totalTaxCollected * 100) / 100,
        totalTaxableAmount: Math.round(totalTaxableAmount * 100) / 100,
        partiesCount: parties.length,
      },
    };
  }
}
