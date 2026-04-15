import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoomDto, UpdateRoomDto } from './dto/rooms.dto';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRoomDto) {
    return this.prisma.room.create({
      data: dto,
      include: { files: true },
    });
  }

  async findAll(locationId: string) {
    return this.prisma.room.findMany({
      where: { locationId },
      include: {
        files: true,
        _count: { select: { parties: true, packageRooms: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        files: true,
        packageRooms: { include: { package: { select: { id: true, name: true } } } },
      },
    });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async update(id: string, dto: UpdateRoomDto) {
    await this.findOne(id);
    return this.prisma.room.update({
      where: { id },
      data: dto,
      include: { files: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.room.delete({ where: { id } });
    return { message: 'Room deleted' };
  }

  async reorder(ids: string[]) {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.room.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
    return { message: 'Room order updated' };
  }

  async addFile(roomId: string, fileUrl: string, fileType = 'image') {
    return this.prisma.roomFile.create({
      data: { roomId, fileUrl, fileType },
    });
  }

  async removeFile(fileId: string) {
    await this.prisma.roomFile.delete({ where: { id: fileId } });
    return { message: 'File removed' };
  }

  // Check room availability for a given date and time range
  async checkAvailability(roomId: string, date: Date, startTime: string, endTime: string, excludePartyId?: string) {
    const dateOnly = new Date(date.toISOString().split('T')[0]);

    const conflicts = await this.prisma.party.findMany({
      where: {
        roomId,
        partyDate: dateOnly,
        status: { in: ['ACTIVE', 'REQUEST', 'GUEST'] },
        id: excludePartyId ? { not: excludePartyId } : undefined,
        OR: [
          { startTime: { lt: endTime }, endTime: { gt: startTime } },
        ],
      },
      select: { id: true, partyName: true, startTime: true, endTime: true },
    });

    const blockedTimes = await this.prisma.blockedTime.findMany({
      where: {
        roomId,
        date: dateOnly,
        OR: [
          { startTime: { lt: endTime }, endTime: { gt: startTime } },
        ],
      },
    });

    return {
      available: conflicts.length === 0 && blockedTimes.length === 0,
      conflicts,
      blockedTimes,
    };
  }
}
