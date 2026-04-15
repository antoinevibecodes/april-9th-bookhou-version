import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { formatLocalDateTime, nowInTimezone } from '../../common/helpers/timezone.helper';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // Task #1: Dashboard displays local timezone
  // Task #9: Revenue totals hidden from Business Admin (handled by controller guard)
  async getDashboard(locationId: string) {
    const location = await this.prisma.businessLocation.findUnique({
      where: { id: locationId },
      select: { timezone: true, name: true },
    });
    if (!location) throw new NotFoundException('Location not found');

    const tz = location.timezone;
    const now = nowInTimezone(tz);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Today's parties
    const todaysParties = await this.prisma.party.findMany({
      where: {
        locationId,
        partyDate: { gte: todayStart, lte: todayEnd },
        status: { in: ['ACTIVE', 'REQUEST', 'GUEST'] },
      },
      include: {
        package: { select: { name: true, duration: true } },
        room: { select: { name: true } },
        _count: { select: { payments: true, invitations: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    // Upcoming parties (next 7 days)
    const weekEnd = new Date(todayEnd);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const upcomingParties = await this.prisma.party.findMany({
      where: {
        locationId,
        partyDate: { gt: todayEnd, lte: weekEnd },
        status: { in: ['ACTIVE', 'REQUEST'] },
      },
      include: {
        package: { select: { name: true } },
        room: { select: { name: true } },
      },
      orderBy: { partyDate: 'asc' },
      take: 10,
    });

    // Recent messages/activity
    const recentPayments = await this.prisma.payment.findMany({
      where: { party: { locationId } },
      include: {
        party: { select: { partyName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Stats
    const [activeCount, requestCount, completedThisMonth] = await Promise.all([
      this.prisma.party.count({ where: { locationId, status: 'ACTIVE' } }),
      this.prisma.party.count({ where: { locationId, status: 'REQUEST' } }),
      this.prisma.party.count({
        where: {
          locationId,
          status: 'COMPLETE',
          updatedAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
        },
      }),
    ]);

    return {
      locationName: location.name,
      timezone: tz,
      currentTime: formatLocalDateTime(new Date(), tz),
      todaysParties: todaysParties.map((p) => ({
        ...p,
        startTimeLocal: p.startTime,
        endTimeLocal: p.endTime,
      })),
      upcomingParties,
      recentPayments: recentPayments.map((p) => ({
        ...p,
        processedAtLocal: formatLocalDateTime(p.processedAt, tz),
      })),
      stats: {
        todaysEvents: todaysParties.length,
        activeBookings: activeCount,
        pendingRequests: requestCount,
        completedThisMonth,
      },
    };
  }

  // Revenue info — restricted endpoint (Task #9: not shown to Business Admin)
  async getRevenueInfo(locationId: string) {
    const totalRevenue = await this.prisma.payment.aggregate({
      where: {
        party: { locationId },
        status: 'PAID',
      },
      _sum: { amount: true },
    });

    const totalRefunds = await this.prisma.payment.aggregate({
      where: {
        party: { locationId },
        status: 'REFUND',
      },
      _sum: { amount: true },
    });

    return {
      totalRevenue: totalRevenue._sum.amount || 0,
      totalRefunds: totalRefunds._sum.amount || 0,
      netRevenue: Number(totalRevenue._sum.amount || 0) - Number(totalRefunds._sum.amount || 0),
    };
  }
}
