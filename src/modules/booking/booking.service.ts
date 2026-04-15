import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Public booking page service — no auth required
// This powers the customer-facing booking flow
@Injectable()
export class BookingService {
  constructor(private prisma: PrismaService) {}

  // Step 1: Get location info + available packages for the booking page
  async getBookingPage(locationPrefix: string) {
    const location = await this.prisma.businessLocation.findUnique({
      where: { prefix: locationPrefix },
      include: {
        business: { select: { name: true, logoUrl: true } },
        workHours: { orderBy: { dayOfWeek: 'asc' } },
        gallery: { orderBy: { sortOrder: 'asc' }, take: 10 },
      },
    });
    if (!location) throw new NotFoundException('Location not found');

    const packages = await this.prisma.package.findMany({
      where: { locationId: location.id, isActive: true },
      include: {
        packageRooms: { include: { room: { select: { id: true, name: true } } } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const partyTypes = await this.prisma.partyType.findMany({
      where: { locationId: location.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      business: location.business,
      location: {
        id: location.id,
        name: location.name,
        address: location.address,
        city: location.city,
        state: location.state,
        zipCode: location.zipCode,
        phone: location.phone,
        timezone: location.timezone,
        currency: location.currency,
        bookingPageTitle: location.bookingPageTitle,
        bookingPageDesc: location.bookingPageDesc,
      },
      packages,
      partyTypes,
      workHours: location.workHours,
      gallery: location.gallery,
    };
  }

  // Step 2: Get addons for a selected package
  async getPackageAddons(packageId: string) {
    return this.prisma.addon.findMany({
      where: {
        packageAddons: { some: { packageId } },
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // Step 3: Check date/time availability
  async checkAvailability(locationId: string, date: string, packageId: string) {
    const pkg = await this.prisma.package.findUnique({
      where: { id: packageId },
      include: { timeSlots: true, packageRooms: { include: { room: true } } },
    });
    if (!pkg) throw new NotFoundException('Package not found');

    const partyDate = new Date(date);
    const dayOfWeek = partyDate.getDay();

    // Get time slots for this day
    const daySlots = pkg.timeSlots.filter((ts) => ts.dayOfWeek === dayOfWeek);

    // Check off day
    const offDay = await this.prisma.offDay.findFirst({
      where: { locationId, date: partyDate },
    });
    if (offDay) return { available: false, reason: offDay.reason || 'Location closed', slots: [] };

    // For each time slot, check if there are conflicts
    const availableSlots = [];
    for (const slot of daySlots) {
      const conflicts = await this.prisma.party.count({
        where: {
          locationId,
          partyDate,
          status: { in: ['ACTIVE', 'REQUEST', 'GUEST'] },
          startTime: { lt: slot.endTime },
          endTime: { gt: slot.startTime },
        },
      });

      const blocked = await this.prisma.blockedTime.count({
        where: {
          locationId,
          date: partyDate,
          startTime: { lt: slot.endTime },
          endTime: { gt: slot.startTime },
        },
      });

      // Check room availability
      const rooms = pkg.packageRooms.map((pr) => pr.room);
      const availableRooms = [];
      for (const room of rooms) {
        const roomConflicts = await this.prisma.party.count({
          where: {
            roomId: room.id,
            partyDate,
            status: { in: ['ACTIVE', 'REQUEST', 'GUEST'] },
            startTime: { lt: slot.endTime },
            endTime: { gt: slot.startTime },
          },
        });
        if (roomConflicts === 0) {
          availableRooms.push({ id: room.id, name: room.name });
        }
      }

      availableSlots.push({
        startTime: slot.startTime,
        endTime: slot.endTime,
        available: conflicts === 0 && blocked === 0 && availableRooms.length > 0,
        availableRooms,
      });
    }

    return {
      available: availableSlots.some((s) => s.available),
      date,
      packageName: pkg.name,
      duration: pkg.duration,
      slots: availableSlots,
    };
  }

  // Step 4: Get booking confirmation details (public — Task #14: link must work)
  async getBookingDetails(partyId: string) {
    const party = await this.prisma.party.findUnique({
      where: { id: partyId },
      include: {
        package: { select: { name: true, contents: true, duration: true } },
        room: { select: { name: true } },
        addons: { include: { addon: { select: { name: true } } } },
        location: {
          select: {
            name: true,
            address: true,
            city: true,
            state: true,
            phone: true,
            timezone: true,
            business: { select: { name: true, logoUrl: true } },
          },
        },
      },
    });
    if (!party) throw new NotFoundException('Booking not found');

    return {
      id: party.id,
      status: party.status,
      invoiceNumber: party.invoiceNumber,
      partyName: party.partyName,
      childName: party.childName,
      partyDate: party.partyDate,
      startTime: party.startTime,
      endTime: party.endTime,
      guestCount: party.guestCount,
      package: party.package,
      room: party.room,
      addons: party.addons,
      total: party.total,
      amountPaid: party.amountPaid,
      balance: party.balance,
      location: party.location,
    };
  }
}
