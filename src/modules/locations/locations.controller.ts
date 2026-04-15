import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { LocationsService } from './locations.service';
import {
  CreateLocationDto,
  UpdateLocationDto,
  SetPaymentMethodDto,
  WorkHoursDto,
  OffDayDto,
  CreateTaxDto,
} from './dto/location.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Locations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('locations')
export class LocationsController {
  constructor(private locationsService: LocationsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER)
  create(@Body() dto: CreateLocationDto) {
    return this.locationsService.create(dto);
  }

  @Get()
  findAll(@Query('businessId') businessId: string) {
    return this.locationsService.findAll(businessId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.locationsService.findOne(id);
  }

  @Get('prefix/:prefix')
  findByPrefix(@Param('prefix') prefix: string) {
    return this.locationsService.findByPrefix(prefix);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateLocationDto) {
    return this.locationsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.locationsService.remove(id);
  }

  // ── Payment Gateway ────────────────────────────────────────

  @Post(':id/payment-method')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER)
  setPaymentMethod(@Param('id') id: string, @Body() dto: SetPaymentMethodDto) {
    return this.locationsService.setPaymentMethod(id, dto);
  }

  // ── Work Hours ─────────────────────────────────────────────

  @Get(':id/work-hours')
  getWorkHours(@Param('id') id: string) {
    return this.locationsService.getWorkHours(id);
  }

  @Patch(':id/work-hours')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER)
  setWorkHours(@Param('id') id: string, @Body() hours: WorkHoursDto[]) {
    return this.locationsService.setWorkHours(id, hours);
  }

  // ── Off Days ───────────────────────────────────────────────

  @Get(':id/off-days')
  getOffDays(@Param('id') id: string) {
    return this.locationsService.getOffDays(id);
  }

  @Post(':id/off-days')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER)
  addOffDay(@Param('id') id: string, @Body() dto: OffDayDto) {
    return this.locationsService.addOffDay(id, dto);
  }

  @Delete('off-days/:offDayId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER)
  removeOffDay(@Param('offDayId') offDayId: string) {
    return this.locationsService.removeOffDay(offDayId);
  }

  // ── Taxes (Task #19, #20) ──────────────────────────────────

  @Get(':id/taxes')
  getTaxes(@Param('id') id: string) {
    return this.locationsService.getTaxes(id);
  }

  @Post(':id/taxes')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER)
  createTax(@Param('id') id: string, @Body() dto: CreateTaxDto) {
    return this.locationsService.createTax(id, dto);
  }

  @Delete('taxes/:taxId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER)
  removeTax(@Param('taxId') taxId: string) {
    return this.locationsService.removeTax(taxId);
  }

  // ── Notification Emails ────────────────────────────────────

  @Get(':id/notification-emails')
  getNotificationEmails(@Param('id') id: string) {
    return this.locationsService.getNotificationEmails(id);
  }

  @Post(':id/notification-emails')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER)
  addNotificationEmail(@Param('id') id: string, @Body('email') email: string) {
    return this.locationsService.addNotificationEmail(id, email);
  }

  @Delete('notification-emails/:emailId')
  removeNotificationEmail(@Param('emailId') emailId: string) {
    return this.locationsService.removeNotificationEmail(emailId);
  }

  // ── Social Links ───────────────────────────────────────────

  @Get(':id/social-links')
  getSocialLinks(@Param('id') id: string) {
    return this.locationsService.getSocialLinks(id);
  }

  @Post(':id/social-links')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER)
  setSocialLinks(@Param('id') id: string, @Body() links: { platform: string; url: string }[]) {
    return this.locationsService.setSocialLinks(id, links);
  }
}
