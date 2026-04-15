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
import { EmailService } from './email.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Email')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('email')
export class EmailController {
  constructor(private emailService: EmailService) {}

  // ── Templates ──────────────────────────────────────────────

  @Post('templates')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER)
  createTemplate(
    @Body() data: { locationId: string; name: string; subject: string; body: string; trigger?: string },
  ) {
    return this.emailService.createTemplate(data);
  }

  @Get('templates')
  findTemplates(@Query('locationId') locationId: string) {
    return this.emailService.findTemplates(locationId);
  }

  @Get('templates/:id')
  findTemplate(@Param('id') id: string) {
    return this.emailService.findTemplate(id);
  }

  @Patch('templates/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER)
  updateTemplate(@Param('id') id: string, @Body() data: any) {
    return this.emailService.updateTemplate(id, data);
  }

  @Delete('templates/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER)
  deleteTemplate(@Param('id') id: string) {
    return this.emailService.deleteTemplate(id);
  }

  // ── Send Emails ────────────────────────────────────────────

  // Task #14: Booking confirmation with working link
  @Post('send/booking-confirmation/:partyId')
  sendBookingConfirmation(@Param('partyId') partyId: string) {
    return this.emailService.sendBookingConfirmation(partyId);
  }

  // Task #16: Balance settled confirmation email
  @Post('send/balance-settled/:partyId')
  sendBalanceSettled(@Param('partyId') partyId: string) {
    return this.emailService.sendBalanceSettledEmail(partyId);
  }

  // Task #15: View email history for a booking
  @Get('history/:partyId')
  getEmailHistory(@Param('partyId') partyId: string) {
    return this.emailService.getEmailHistory(partyId);
  }

  // Resend a previously sent email
  @Post('resend/:emailLogId')
  resendEmail(@Param('emailLogId') emailLogId: string) {
    return this.emailService.resendEmail(emailLogId);
  }
}
