import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateLocationDto,
  UpdateLocationDto,
  SetPaymentMethodDto,
  WorkHoursDto,
  OffDayDto,
  CreateTaxDto,
} from './dto/location.dto';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  // ── Location CRUD ──────────────────────────────────────────

  async create(dto: CreateLocationDto) {
    const existing = await this.prisma.businessLocation.findUnique({
      where: { prefix: dto.prefix },
    });
    if (existing) throw new ConflictException('Location prefix already taken');

    return this.prisma.businessLocation.create({
      data: dto,
    });
  }

  async findAll(businessId: string) {
    return this.prisma.businessLocation.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const location = await this.prisma.businessLocation.findUnique({
      where: { id },
      include: {
        workHours: { orderBy: { dayOfWeek: 'asc' } },
        offDays: { orderBy: { date: 'asc' } },
        taxes: true,
        notifications: true,
        socialLinks: true,
      },
    });
    if (!location) throw new NotFoundException('Location not found');
    return location;
  }

  async findByPrefix(prefix: string) {
    const location = await this.prisma.businessLocation.findUnique({
      where: { prefix },
      include: { business: true },
    });
    if (!location) throw new NotFoundException('Location not found');
    return location;
  }

  async update(id: string, dto: UpdateLocationDto) {
    await this.findOne(id);
    return this.prisma.businessLocation.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.businessLocation.delete({ where: { id } });
    return { message: 'Location deleted' };
  }

  // ── Payment Method Config (Task #6: multiple payment modes) ──

  async setPaymentMethod(locationId: string, dto: SetPaymentMethodDto) {
    await this.findOne(locationId);
    return this.prisma.businessLocation.update({
      where: { id: locationId },
      data: {
        paymentMethod: dto.paymentMethod,
        stripeSecretKey: dto.stripeSecretKey,
        stripePublicKey: dto.stripePublicKey,
        squareAccessToken: dto.squareAccessToken,
        squareLocationId: dto.squareLocationId,
        squareAppId: dto.squareAppId,
        squareEnvironment: dto.squareEnvironment,
      },
    });
  }

  // ── Work Hours ─────────────────────────────────────────────

  async getWorkHours(locationId: string) {
    return this.prisma.workHours.findMany({
      where: { locationId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async setWorkHours(locationId: string, hours: WorkHoursDto[]) {
    await this.findOne(locationId);

    // Upsert all days in a transaction
    return this.prisma.$transaction(
      hours.map((h) =>
        this.prisma.workHours.upsert({
          where: {
            locationId_dayOfWeek: { locationId, dayOfWeek: h.dayOfWeek },
          },
          update: {
            openTime: h.openTime,
            closeTime: h.closeTime,
            isClosed: h.isClosed ?? false,
          },
          create: {
            locationId,
            dayOfWeek: h.dayOfWeek,
            openTime: h.openTime,
            closeTime: h.closeTime,
            isClosed: h.isClosed ?? false,
          },
        }),
      ),
    );
  }

  // ── Off Days ───────────────────────────────────────────────

  async getOffDays(locationId: string) {
    return this.prisma.offDay.findMany({
      where: { locationId },
      orderBy: { date: 'asc' },
    });
  }

  async addOffDay(locationId: string, dto: OffDayDto) {
    await this.findOne(locationId);
    return this.prisma.offDay.create({
      data: {
        locationId,
        date: new Date(dto.date),
        reason: dto.reason,
      },
    });
  }

  async removeOffDay(id: string) {
    await this.prisma.offDay.delete({ where: { id } });
    return { message: 'Off day removed' };
  }

  // ── Taxes (Task #19: percentage-based, Task #20: totals in reports) ──

  async getTaxes(locationId: string) {
    return this.prisma.tax.findMany({
      where: { locationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTax(locationId: string, dto: CreateTaxDto) {
    await this.findOne(locationId);

    // If setting as default, unset other defaults first
    if (dto.isDefault) {
      await this.prisma.tax.updateMany({
        where: { locationId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.tax.create({
      data: {
        locationId,
        name: dto.name,
        rate: dto.rate,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async removeTax(id: string) {
    await this.prisma.tax.delete({ where: { id } });
    return { message: 'Tax removed' };
  }

  // ── Notification Emails ────────────────────────────────────

  async getNotificationEmails(locationId: string) {
    return this.prisma.notificationEmail.findMany({ where: { locationId } });
  }

  async addNotificationEmail(locationId: string, email: string) {
    await this.findOne(locationId);
    return this.prisma.notificationEmail.create({
      data: { locationId, email },
    });
  }

  async removeNotificationEmail(id: string) {
    await this.prisma.notificationEmail.delete({ where: { id } });
    return { message: 'Notification email removed' };
  }

  // ── Social Links ───────────────────────────────────────────

  async getSocialLinks(locationId: string) {
    return this.prisma.socialLink.findMany({ where: { locationId } });
  }

  async setSocialLinks(locationId: string, links: { platform: string; url: string }[]) {
    await this.findOne(locationId);

    await this.prisma.socialLink.deleteMany({ where: { locationId } });
    return this.prisma.socialLink.createMany({
      data: links.map((l) => ({ locationId, ...l })),
    });
  }
}
