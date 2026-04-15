import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTeamMemberDto, UpdateTeamMemberDto, ChangeRoleDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createTeamMember(dto: CreateTeamMemberDto) {
    // Check if user already exists by email
    let user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user) {
      // Create a new user with a temporary password (they'll be invited to set their own)
      const tempPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), 12);
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash: tempPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          role: dto.role,
        },
      });
    }

    // Check if already assigned to this location
    const existing = await this.prisma.businessMember.findUnique({
      where: { userId_locationId: { userId: user.id, locationId: dto.locationId } },
    });
    if (existing) throw new ConflictException('User already assigned to this location');

    // Create the business member assignment
    await this.prisma.businessMember.create({
      data: {
        businessId: dto.businessId,
        locationId: dto.locationId,
        userId: user.id,
        role: dto.role,
      },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: dto.role,
    };
  }

  async findTeamMembers(locationId: string) {
    return this.prisma.businessMember.findMany({
      where: { locationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        businessMembers: {
          include: {
            business: { select: { id: true, name: true } },
            location: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(userId: string, dto: UpdateTeamMemberDto) {
    await this.findOne(userId);
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        isActive: dto.isActive,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
      },
    });
  }

  // Task #4: Employee permission management via role changes
  async changeRole(userId: string, locationId: string, dto: ChangeRoleDto) {
    // Update the user's global role
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: dto.role },
    });

    // Update the business member role for this location
    await this.prisma.businessMember.update({
      where: { userId_locationId: { userId, locationId } },
      data: { role: dto.role },
    });

    return { message: 'Role updated', role: dto.role };
  }

  async toggleStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: { id: true, isActive: true },
    });
  }

  async remove(userId: string, locationId: string) {
    await this.prisma.businessMember.delete({
      where: { userId_locationId: { userId, locationId } },
    });
    return { message: 'Team member removed from location' };
  }

  // Get locations accessible by a user (for multi-location support)
  async getUserLocations(userId: string) {
    return this.prisma.businessMember.findMany({
      where: { userId },
      include: {
        business: { select: { id: true, name: true, prefix: true } },
        location: { select: { id: true, name: true, prefix: true, timezone: true } },
      },
    });
  }
}
