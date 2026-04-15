import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  CreatePartyDto,
  UpdatePartyDto,
  CancelPartyDto,
  PartyFilterDto,
} from './dto/parties.dto';
import { generateInvoiceNumber } from '../../common/helpers/invoice-number.helper';
import { CalendarService } from '../calendar/calendar.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PartiesService {
  private readonly logger = new Logger(PartiesService.name);

  constructor(
    private prisma: PrismaService,
    private calendarService: CalendarService,
    private notifications: NotificationsService,
  ) {}

  async create(dto: CreatePartyDto) {
    // Get package for pricing
    const pkg = await this.prisma.package.findUnique({ where: { id: dto.packageId } });
    if (!pkg) throw new NotFoundException('Package not found');

    // Get location for tax
    const location = await this.prisma.businessLocation.findUnique({
      where: { id: dto.locationId },
      include: { taxes: { where: { isDefault: true, isActive: true }, take: 1 } },
    });
    if (!location) throw new NotFoundException('Location not found');

    // Calculate pricing
    const packagePrice = new Decimal(pkg.price);
    let extraPersonAmount = new Decimal(0);

    // Task #17: Extra person pricing for field trips
    if (pkg.extraPerPersonPrice && pkg.maxGuests && dto.guestCount > pkg.maxGuests) {
      const extraGuests = dto.guestCount - pkg.maxGuests;
      extraPersonAmount = new Decimal(pkg.extraPerPersonPrice).mul(extraGuests);
    }

    // Calculate addon total (Task #10: custom amounts supported)
    let addonTotal = new Decimal(0);
    if (dto.addons?.length) {
      for (const addon of dto.addons) {
        addonTotal = addonTotal.add(new Decimal(addon.price).mul(addon.quantity || 1));
      }
    }

    const subtotal = packagePrice.add(extraPersonAmount).add(addonTotal);

    // Apply coupon discount if provided
    let discountAmount = new Decimal(0);
    if (dto.couponCode) {
      const coupon = await this.prisma.coupon.findFirst({
        where: {
          locationId: dto.locationId,
          code: dto.couponCode,
          isActive: true,
        },
      });
      if (coupon) {
        if (coupon.type === 'PERCENTAGE') {
          discountAmount = subtotal.mul(coupon.value).div(100);
        } else if (coupon.type === 'FIXED_AMOUNT') {
          discountAmount = new Decimal(coupon.value);
        } else if (coupon.type === 'FULL_AMOUNT') {
          discountAmount = subtotal;
        }
        // Increment usage
        await this.prisma.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    }

    // Task #19: Tax as percentage, not flat $6
    const taxRate = location.taxes[0]?.rate ?? new Decimal(0);
    const taxableAmount = subtotal.sub(discountAmount);
    const taxAmount = taxableAmount.mul(taxRate);
    const total = taxableAmount.add(taxAmount);
    const balance = total;

    // Generate invoice number
    const partyCount = await this.prisma.party.count();
    const invoiceNumber = generateInvoiceNumber(partyCount + 1);

    // Create party with addons
    const party = await this.prisma.party.create({
      data: {
        locationId: dto.locationId,
        packageId: dto.packageId,
        roomId: dto.roomId,
        eventType: dto.eventType,
        hostFirstName: dto.hostFirstName,
        hostLastName: dto.hostLastName,
        hostEmail: dto.hostEmail,
        hostPhone: dto.hostPhone,
        childName: dto.childName,
        childDob: dto.childDob ? new Date(dto.childDob) : undefined,
        partyName: dto.partyName,
        partyDate: new Date(dto.partyDate),
        startTime: dto.startTime,
        endTime: dto.endTime,
        guestCount: dto.guestCount,
        bannerUrl: dto.bannerUrl,
        packagePrice,
        extraPersonAmount,
        addonTotal,
        subtotal,
        discountAmount,
        taxRate,
        taxAmount,
        total,
        balance,
        invoiceNumber,
        addons: dto.addons?.length
          ? {
              create: dto.addons.map((a) => ({
                addonId: a.addonId || undefined,
                customName: a.customName,
                customDesc: a.customDesc,
                price: a.price,
                quantity: a.quantity || 1,
              })),
            }
          : undefined,
      },
      include: {
        package: { select: { id: true, name: true, contents: true, duration: true } },
        room: { select: { id: true, name: true } },
        addons: { include: { addon: true } },
        location: { select: { id: true, name: true, timezone: true, address: true } },
      },
    });

    // Google Calendar sync (fire-and-forget — don't block booking)
    this.syncCalendarCreate(party).catch((err) =>
      this.logger.warn(`Calendar sync failed for party ${party.id}: ${err.message}`),
    );

    // Send booking confirmation email + SMS (fire-and-forget)
    this.notifications.partyCreated(party.id).catch((err) =>
      this.logger.warn(`Notification failed for party ${party.id}: ${err.message}`),
    );

    return party;
  }

  // Calendar sync helpers
  private async syncCalendarCreate(party: any) {
    const eventParams = this.calendarService.buildEventFromParty({
      id: party.id,
      partyName: party.partyName,
      childName: party.childName,
      hostFirstName: party.hostFirstName,
      hostLastName: party.hostLastName,
      hostEmail: party.hostEmail,
      hostPhone: party.hostPhone,
      partyDate: party.partyDate,
      startTime: party.startTime,
      endTime: party.endTime,
      guestCount: party.guestCount,
      location: party.location,
      package: party.package,
    });
    await this.calendarService.createEvent(eventParams);
  }

  async findAll(filters: PartyFilterDto) {
    const { locationId, status, dateFrom, dateTo, search, page = 1, limit = 20 } = filters;

    const where: any = {};
    if (locationId) where.locationId = locationId;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.partyDate = {};
      if (dateFrom) where.partyDate.gte = new Date(dateFrom);
      if (dateTo) where.partyDate.lte = new Date(dateTo);
    }
    if (search) {
      where.OR = [
        { partyName: { contains: search, mode: 'insensitive' } },
        { hostFirstName: { contains: search, mode: 'insensitive' } },
        { hostLastName: { contains: search, mode: 'insensitive' } },
        { hostEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [parties, total] = await Promise.all([
      this.prisma.party.findMany({
        where,
        include: {
          package: { select: { id: true, name: true } },
          room: { select: { id: true, name: true } },
          location: { select: { id: true, name: true, timezone: true } },
          _count: { select: { payments: true, invitations: true } },
        },
        orderBy: { partyDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.party.count({ where }),
    ]);

    return {
      data: parties,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const party = await this.prisma.party.findUnique({
      where: { id },
      include: {
        package: true,
        room: true,
        location: { select: { id: true, name: true, timezone: true, currency: true, refundPolicy: true } },
        addons: { include: { addon: true } },
        payments: { orderBy: { createdAt: 'desc' } },
        invitations: true,
        waivers: true,
        notes: { include: { user: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' } },
        assignments: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        emailLogs: { orderBy: { sentAt: 'desc' } },
      },
    });
    if (!party) throw new NotFoundException('Party not found');
    return party;
  }

  async update(id: string, dto: UpdatePartyDto) {
    const party = await this.findOne(id);
    const { addons, ...data } = dto;

    // If guest count changed and package has extra person pricing, recalculate
    let recalculate = false;
    const updateData: any = { ...data };

    if (data.partyDate) updateData.partyDate = new Date(data.partyDate);

    if (data.guestCount && data.guestCount !== party.guestCount) {
      recalculate = true;
    }

    if (recalculate) {
      const pkg = await this.prisma.package.findUnique({ where: { id: party.packageId } });
      if (pkg) {
        const guestCount = data.guestCount || party.guestCount;
        let extraPersonAmount = new Decimal(0);
        if (pkg.extraPerPersonPrice && pkg.maxGuests && guestCount > pkg.maxGuests) {
          const extraGuests = guestCount - pkg.maxGuests;
          extraPersonAmount = new Decimal(pkg.extraPerPersonPrice).mul(extraGuests);
        }
        updateData.extraPersonAmount = extraPersonAmount;
        const subtotal = new Decimal(party.packagePrice).add(extraPersonAmount).add(party.addonTotal);
        const taxableAmount = subtotal.sub(party.discountAmount);
        const taxAmount = taxableAmount.mul(party.taxRate);
        const total = taxableAmount.add(taxAmount);
        updateData.subtotal = subtotal;
        updateData.taxAmount = taxAmount;
        updateData.total = total;
        updateData.balance = total.sub(party.amountPaid).add(party.amountRefunded);
      }
    }

    // Update addons if provided
    if (addons !== undefined) {
      await this.prisma.partyAddon.deleteMany({ where: { partyId: id } });
      if (addons.length > 0) {
        await this.prisma.partyAddon.createMany({
          data: addons.map((a) => ({
            partyId: id,
            addonId: a.addonId || undefined,
            customName: a.customName,
            customDesc: a.customDesc,
            price: a.price,
            quantity: a.quantity || 1,
          })),
        });
        // Recalculate addon total
        let addonTotal = new Decimal(0);
        for (const a of addons) {
          addonTotal = addonTotal.add(new Decimal(a.price).mul(a.quantity || 1));
        }
        updateData.addonTotal = addonTotal;

        // Recalculate totals
        const subtotal = new Decimal(party.packagePrice)
          .add(updateData.extraPersonAmount ?? party.extraPersonAmount)
          .add(addonTotal);
        const taxableAmount = subtotal.sub(party.discountAmount);
        const taxAmount = taxableAmount.mul(party.taxRate);
        const total = taxableAmount.add(taxAmount);
        updateData.subtotal = subtotal;
        updateData.taxAmount = taxAmount;
        updateData.total = total;
        updateData.balance = total.sub(party.amountPaid).add(party.amountRefunded);
      }
    }

    const updated = await this.prisma.party.update({
      where: { id },
      data: updateData,
      include: {
        package: { select: { id: true, name: true, contents: true } },
        room: { select: { id: true, name: true } },
        addons: { include: { addon: true } },
      },
    });

    // Send update notification (fire-and-forget)
    if (data.partyDate && data.partyDate !== party.partyDate?.toISOString()?.split('T')[0]) {
      this.notifications.partyDateChanged(id, party.partyDate?.toLocaleDateString('en-US') || '', new Date(data.partyDate).toLocaleDateString('en-US')).catch(() => {});
    } else {
      this.notifications.partyUpdated(id).catch(() => {});
    }

    return updated;
  }

  async changeStatus(id: string, status: string) {
    await this.findOne(id);
    const updated = await this.prisma.party.update({
      where: { id },
      data: { status: status as any },
      select: { id: true, status: true },
    });

    // Send notifications based on status change (fire-and-forget)
    if (status === 'COMPLETED') {
      this.notifications.partyCompleted(id).catch(() => {});
    } else if (status === 'REJECTED') {
      this.notifications.partyRejected(id).catch(() => {});
    }

    return updated;
  }

  // Task #7, #8, #9: Full cancellation flow with exact refund amount support
  async cancel(id: string, dto: CancelPartyDto) {
    const party = await this.findOne(id);

    if (party.status === 'CANCELLED') {
      throw new BadRequestException('Party is already cancelled');
    }

    let refundAmount: Decimal;

    if (dto.refundType === 'PERCENTAGE') {
      // Refund X% of amount paid
      refundAmount = new Decimal(party.amountPaid).mul(dto.refundValue).div(100);
    } else {
      // FIXED_AMOUNT: refundValue is the cancellation FEE to keep
      // So refund = amountPaid - fee
      const fee = new Decimal(dto.refundValue);
      refundAmount = new Decimal(party.amountPaid).sub(fee);
      if (refundAmount.lt(0)) refundAmount = new Decimal(0);
    }

    const cancelled = await this.prisma.party.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancellationFee: dto.refundType === 'FIXED_AMOUNT' ? dto.refundValue : undefined,
        cancellationRefundType: dto.refundType,
        cancellationRefundValue: dto.refundValue,
        cancellationReason: dto.reason,
        cancelledAt: new Date(),
        amountRefunded: { increment: refundAmount },
        balance: new Decimal(party.total).sub(party.amountPaid).add(party.amountRefunded).add(refundAmount),
      },
      include: {
        payments: true,
        location: { select: { timezone: true } },
      },
    });

    // Delete calendar event on cancellation (fire-and-forget)
    this.calendarService.findEventByPartyId(id).then((eventId) => {
      if (eventId) this.calendarService.deleteEvent(eventId);
    }).catch((err) =>
      this.logger.warn(`Calendar delete failed for party ${id}: ${err.message}`),
    );

    // Send cancellation notifications (fire-and-forget)
    const refundNum = refundAmount.toNumber();
    this.notifications.partyCancelledHost(id, refundNum > 0 ? refundNum : undefined).catch(() => {});
    this.notifications.partyCancelledGuests(id).catch(() => {});

    return cancelled;
  }

  // Price calculation endpoint (for frontend preview)
  async calculatePrice(data: {
    packageId: string;
    locationId: string;
    guestCount: number;
    addonPrices?: { price: number; quantity: number }[];
    couponCode?: string;
  }) {
    const pkg = await this.prisma.package.findUnique({ where: { id: data.packageId } });
    if (!pkg) throw new NotFoundException('Package not found');

    const location = await this.prisma.businessLocation.findUnique({
      where: { id: data.locationId },
      include: { taxes: { where: { isDefault: true, isActive: true }, take: 1 } },
    });
    if (!location) throw new NotFoundException('Location not found');

    const packagePrice = Number(pkg.price);
    let extraPersonAmount = 0;
    if (pkg.extraPerPersonPrice && pkg.maxGuests && data.guestCount > pkg.maxGuests) {
      extraPersonAmount = Number(pkg.extraPerPersonPrice) * (data.guestCount - pkg.maxGuests);
    }

    let addonTotal = 0;
    if (data.addonPrices?.length) {
      addonTotal = data.addonPrices.reduce((sum, a) => sum + a.price * a.quantity, 0);
    }

    const subtotal = packagePrice + extraPersonAmount + addonTotal;

    let discountAmount = 0;
    if (data.couponCode) {
      const coupon = await this.prisma.coupon.findFirst({
        where: { locationId: data.locationId, code: data.couponCode, isActive: true },
      });
      if (coupon) {
        if (coupon.type === 'PERCENTAGE') discountAmount = subtotal * Number(coupon.value) / 100;
        else if (coupon.type === 'FIXED_AMOUNT') discountAmount = Number(coupon.value);
        else if (coupon.type === 'FULL_AMOUNT') discountAmount = subtotal;
      }
    }

    const taxRate = location.taxes[0]?.rate ? Number(location.taxes[0].rate) : 0;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * taxRate;
    const total = taxableAmount + taxAmount;

    return {
      packagePrice,
      extraPersonAmount,
      addonTotal,
      subtotal,
      discountAmount,
      taxRate,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }

  // Check date/time availability
  async checkAvailability(locationId: string, date: string, startTime: string, endTime: string, roomId?: string) {
    const partyDate = new Date(date);

    // Check off days
    const offDay = await this.prisma.offDay.findFirst({
      where: { locationId, date: partyDate },
    });
    if (offDay) {
      return { available: false, reason: `Location closed: ${offDay.reason || 'Off day'}` };
    }

    // Check existing bookings for conflicts
    const where: any = {
      locationId,
      partyDate,
      status: { in: ['ACTIVE', 'REQUEST', 'GUEST'] },
      OR: [{ startTime: { lt: endTime }, endTime: { gt: startTime } }],
    };
    if (roomId) where.roomId = roomId;

    const conflicts = await this.prisma.party.findMany({
      where,
      select: { id: true, partyName: true, startTime: true, endTime: true, roomId: true },
    });

    // Check blocked times
    const blockedWhere: any = {
      locationId,
      date: partyDate,
      OR: [{ startTime: { lt: endTime }, endTime: { gt: startTime } }],
    };
    if (roomId) blockedWhere.roomId = roomId;

    const blocked = await this.prisma.blockedTime.findMany({ where: blockedWhere });

    return {
      available: conflicts.length === 0 && blocked.length === 0,
      conflicts,
      blockedTimes: blocked,
    };
  }

  // Add note to party
  async addNote(partyId: string, userId: string, content: string) {
    return this.prisma.partyNote.create({
      data: { partyId, userId, content },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
  }

  async deleteNote(noteId: string) {
    await this.prisma.partyNote.delete({ where: { id: noteId } });
    return { message: 'Note deleted' };
  }

  // Assign team member to party
  async assignTeamMember(partyId: string, userId: string) {
    return this.prisma.partyAssignment.create({
      data: { partyId, userId },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async removeAssignment(partyId: string, userId: string) {
    await this.prisma.partyAssignment.delete({
      where: { partyId_userId: { partyId, userId } },
    });
    return { message: 'Assignment removed' };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.party.delete({ where: { id } });
    return { message: 'Party deleted' };
  }
}
