import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePackageDto, UpdatePackageDto } from './dto/packages.dto';

@Injectable()
export class PackagesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePackageDto) {
    const { roomIds, timeSlots, ...data } = dto;

    const pkg = await this.prisma.package.create({
      data: {
        ...data,
        packageRooms: roomIds
          ? { create: roomIds.map((roomId) => ({ roomId })) }
          : undefined,
        timeSlots: timeSlots
          ? { create: timeSlots }
          : undefined,
      },
      include: { packageRooms: { include: { room: true } }, timeSlots: true },
    });

    return pkg;
  }

  async findAll(locationId: string) {
    return this.prisma.package.findMany({
      where: { locationId },
      include: {
        packageRooms: { include: { room: { select: { id: true, name: true } } } },
        packageAddons: { include: { addon: { select: { id: true, name: true, price: true } } } },
        _count: { select: { parties: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const pkg = await this.prisma.package.findUnique({
      where: { id },
      include: {
        packageRooms: { include: { room: true } },
        packageAddons: { include: { addon: true } },
        timeSlots: { orderBy: { dayOfWeek: 'asc' } },
      },
    });
    if (!pkg) throw new NotFoundException('Package not found');
    return pkg;
  }

  async update(id: string, dto: UpdatePackageDto) {
    await this.findOne(id);
    const { roomIds, timeSlots, ...data } = dto;

    // Update package and optionally replace rooms/time slots
    return this.prisma.$transaction(async (tx) => {
      if (roomIds !== undefined) {
        await tx.packageRoom.deleteMany({ where: { packageId: id } });
        if (roomIds.length > 0) {
          await tx.packageRoom.createMany({
            data: roomIds.map((roomId) => ({ packageId: id, roomId })),
          });
        }
      }

      if (timeSlots !== undefined) {
        await tx.packageTimeSlot.deleteMany({ where: { packageId: id } });
        if (timeSlots.length > 0) {
          await tx.packageTimeSlot.createMany({
            data: timeSlots.map((ts) => ({ packageId: id, ...ts })),
          });
        }
      }

      return tx.package.update({
        where: { id },
        data,
        include: {
          packageRooms: { include: { room: true } },
          timeSlots: true,
        },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.package.delete({ where: { id } });
    return { message: 'Package deleted' };
  }

  async toggleStatus(id: string) {
    const pkg = await this.findOne(id);
    return this.prisma.package.update({
      where: { id },
      data: { isActive: !pkg.isActive },
      select: { id: true, isActive: true },
    });
  }

  async duplicate(id: string) {
    const original = await this.findOne(id);
    const { id: _, createdAt, updatedAt, packageRooms, packageAddons, timeSlots, ...data } = original as any;

    return this.prisma.package.create({
      data: {
        ...data,
        name: `${data.name} (Copy)`,
        packageRooms: {
          create: packageRooms.map((pr: any) => ({ roomId: pr.roomId })),
        },
        timeSlots: {
          create: timeSlots.map((ts: any) => ({
            dayOfWeek: ts.dayOfWeek,
            startTime: ts.startTime,
            endTime: ts.endTime,
          })),
        },
      },
      include: { packageRooms: { include: { room: true } }, timeSlots: true },
    });
  }

  async reorder(ids: string[]) {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.package.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
    return { message: 'Order updated' };
  }

  async getTimeSlots(packageId: string) {
    return this.prisma.packageTimeSlot.findMany({
      where: { packageId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }
}
