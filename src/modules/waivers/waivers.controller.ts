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
import { WaiversService } from './waivers.service';
import {
  CreateWaiverTemplateDto,
  UpdateWaiverTemplateDto,
  WaiverQuestionDto,
  SignWaiverDto,
} from './dto/waivers.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Waivers')
@Controller('waivers')
export class WaiversController {
  constructor(private waiversService: WaiversService) {}

  // ── Public endpoints (Task #23: no login required) ─────────

  @Post('sign')
  signWaiver(@Body() dto: SignWaiverDto) {
    return this.waiversService.signWaiver(dto);
  }

  @Get('form/:partyId')
  getWaiverForm(@Param('partyId') partyId: string) {
    return this.waiversService.getWaiverForm(partyId);
  }

  // ── Protected endpoints ────────────────────────────────────

  // Templates
  @Post('templates')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER)
  createTemplate(@Body() dto: CreateWaiverTemplateDto) {
    return this.waiversService.createTemplate(dto);
  }

  @Get('templates')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  findTemplates(@Query('locationId') locationId: string) {
    return this.waiversService.findTemplates(locationId);
  }

  @Get('templates/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  findTemplate(@Param('id') id: string) {
    return this.waiversService.findTemplate(id);
  }

  @Patch('templates/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER)
  updateTemplate(@Param('id') id: string, @Body() dto: UpdateWaiverTemplateDto) {
    return this.waiversService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER)
  deleteTemplate(@Param('id') id: string) {
    return this.waiversService.deleteTemplate(id);
  }

  // Questions
  @Post('templates/:templateId/questions')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER)
  addQuestion(@Param('templateId') templateId: string, @Body() dto: WaiverQuestionDto) {
    return this.waiversService.addQuestion(templateId, dto);
  }

  @Patch('questions/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  updateQuestion(@Param('id') id: string, @Body() dto: Partial<WaiverQuestionDto>) {
    return this.waiversService.updateQuestion(id, dto);
  }

  @Delete('questions/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  deleteQuestion(@Param('id') id: string) {
    return this.waiversService.deleteQuestion(id);
  }

  // Party waivers (Task #22: signed status visible to employees/admins)
  @Get('party/:partyId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  getPartyWaivers(@Param('partyId') partyId: string) {
    return this.waiversService.getPartyWaivers(partyId);
  }

  @Get('signed')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  getSignedWaivers(@Query('locationId') locationId: string) {
    return this.waiversService.getSignedWaivers(locationId);
  }

  @Get('unsigned')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  getUnsignedWaivers(@Query('locationId') locationId: string) {
    return this.waiversService.getUnsignedWaivers(locationId);
  }
}
