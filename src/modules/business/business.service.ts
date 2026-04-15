import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBusinessDto, UpdateBusinessDto } from './dto/business.dto';

@Injectable()
export class BusinessService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBusinessDto) {
    const existing = await this.prisma.business.findUnique({
      where: { prefix: dto.prefix },
    });
    if (existing) {
      throw new ConflictException('Business prefix already taken');
    }

    return this.prisma.business.create({
      data: dto,
      include: { locations: true },
    });
  }

  async findAll() {
    return this.prisma.business.findMany({
      include: {
        locations: {
          select: { id: true, name: true, prefix: true, isActive: true },
        },
        _count: { select: { locations: true, members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        locations: true,
        members: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true, role: true },
            },
          },
        },
      },
    });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async findByPrefix(prefix: string) {
    const business = await this.prisma.business.findUnique({
      where: { prefix },
      include: { locations: true },
    });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async update(id: string, dto: UpdateBusinessDto) {
    await this.findOne(id);
    return this.prisma.business.update({
      where: { id },
      data: dto,
      include: { locations: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.business.delete({ where: { id } });
    return { message: 'Business deleted' };
  }

  async checkPrefixAvailable(prefix: string) {
    const existing = await this.prisma.business.findUnique({ where: { prefix } });
    return { available: !existing };
  }
}
