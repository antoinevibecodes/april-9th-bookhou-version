import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAddonDto, UpdateAddonDto } from './dto/addons.dto';

@Injectable()
export class AddonsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAddonDto) {
    const { packageIds, ...data } = dto;

    return this.prisma.addon.create({
      data: {
        ...data,
        packageAddons: packageIds
          ? { create: packageIds.map((packageId) => ({ packageId })) }
          : undefined,
      },
      include: {
        packageAddons: { include: { package: { select: { id: true, name: true } } } },
      },
    });
  }

  async findAll(locationId: string) {
    return this.prisma.addon.findMany({
      where: { locationId },
      include: {
        packageAddons: { include: { package: { select: { id: true, name: true } } } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findByPackage(packageId: string) {
    return this.prisma.addon.findMany({
      where: {
        packageAddons: { some: { packageId } },
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const addon = await this.prisma.addon.findUnique({
      where: { id },
      include: {
        packageAddons: { include: { package: { select: { id: true, name: true } } } },
      },
    });
    if (!addon) throw new NotFoundException('Addon not found');
    return addon;
  }

  async update(id: string, dto: UpdateAddonDto) {
    await this.findOne(id);
    const { packageIds, ...data } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (packageIds !== undefined) {
        await tx.packageAddon.deleteMany({ where: { addonId: id } });
        if (packageIds.length > 0) {
          await tx.packageAddon.createMany({
            data: packageIds.map((packageId) => ({ addonId: id, packageId })),
          });
        }
      }

      return tx.addon.update({
        where: { id },
        data,
        include: {
          packageAddons: { include: { package: { select: { id: true, name: true } } } },
        },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.addon.delete({ where: { id } });
    return { message: 'Addon deleted' };
  }

  async reorder(ids: string[]) {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.addon.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
    return { message: 'Addon order updated' };
  }
}
