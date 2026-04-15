import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCouponDto, UpdateCouponDto, ApplyCouponDto } from './dto/coupons.dto';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCouponDto) {
    const { packageIds, ...data } = dto;
    return this.prisma.coupon.create({
      data: {
        ...data,
        validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        couponPackages: packageIds
          ? { create: packageIds.map((packageId) => ({ packageId })) }
          : undefined,
      },
      include: { couponPackages: { include: { package: { select: { id: true, name: true } } } } },
    });
  }

  async findAll(locationId: string) {
    return this.prisma.coupon.findMany({
      where: { locationId },
      include: {
        couponPackages: { include: { package: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: { couponPackages: { include: { package: true } } },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async update(id: string, dto: UpdateCouponDto) {
    await this.findOne(id);
    const { packageIds, ...data } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (packageIds !== undefined) {
        await tx.couponPackage.deleteMany({ where: { couponId: id } });
        if (packageIds.length > 0) {
          await tx.couponPackage.createMany({
            data: packageIds.map((packageId) => ({ couponId: id, packageId })),
          });
        }
      }
      return tx.coupon.update({
        where: { id },
        data: {
          ...data,
          validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
          validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        },
        include: { couponPackages: { include: { package: { select: { id: true, name: true } } } } },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.coupon.delete({ where: { id } });
    return { message: 'Coupon deleted' };
  }

  async toggleStatus(id: string) {
    const coupon = await this.findOne(id);
    return this.prisma.coupon.update({
      where: { id },
      data: { isActive: !coupon.isActive },
      select: { id: true, isActive: true },
    });
  }

  // Validate and apply coupon
  async applyCoupon(dto: ApplyCouponDto) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { locationId: dto.locationId, code: dto.code },
      include: { couponPackages: true },
    });

    if (!coupon) throw new NotFoundException('Coupon not found');
    if (!coupon.isActive) throw new BadRequestException('Coupon is inactive');
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom) {
      throw new BadRequestException('Coupon is not yet valid');
    }
    if (coupon.validUntil && now > coupon.validUntil) {
      throw new BadRequestException('Coupon has expired');
    }

    // Check package restriction
    if (dto.packageId && coupon.couponPackages.length > 0) {
      const validForPackage = coupon.couponPackages.some((cp) => cp.packageId === dto.packageId);
      if (!validForPackage) {
        throw new BadRequestException('Coupon is not valid for this package');
      }
    }

    return {
      valid: true,
      type: coupon.type,
      value: coupon.value,
      code: coupon.code,
    };
  }
}
