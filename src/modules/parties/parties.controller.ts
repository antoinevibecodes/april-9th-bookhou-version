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
import { PartiesService } from './parties.service';
import {
  CreatePartyDto,
  UpdatePartyDto,
  ChangeStatusDto,
  CancelPartyDto,
  PartyFilterDto,
} from './dto/parties.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Parties (Bookings)')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('parties')
export class PartiesController {
  constructor(private partiesService: PartiesService) {}

  @Post()
  create(@Body() dto: CreatePartyDto) {
    return this.partiesService.create(dto);
  }

  @Get()
  findAll(@Query() filters: PartyFilterDto) {
    return this.partiesService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.partiesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePartyDto) {
    return this.partiesService.update(id, dto);
  }

  @Patch(':id/status')
  changeStatus(@Param('id') id: string, @Body() dto: ChangeStatusDto) {
    return this.partiesService.changeStatus(id, dto.status);
  }

  // Task #7: Cancel with exact refund amount
  @Post(':id/cancel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER)
  cancel(@Param('id') id: string, @Body() dto: CancelPartyDto) {
    return this.partiesService.cancel(id, dto);
  }

  // Price preview
  @Post('calculate-price')
  calculatePrice(
    @Body()
    data: {
      packageId: string;
      locationId: string;
      guestCount: number;
      addonPrices?: { price: number; quantity: number }[];
      couponCode?: string;
    },
  ) {
    return this.partiesService.calculatePrice(data);
  }

  // Availability check
  @Get('check-availability')
  checkAvailability(
    @Query('locationId') locationId: string,
    @Query('date') date: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Query('roomId') roomId?: string,
  ) {
    return this.partiesService.checkAvailability(locationId, date, startTime, endTime, roomId);
  }

  // Notes
  @Post(':id/notes')
  addNote(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('content') content: string,
  ) {
    return this.partiesService.addNote(id, userId, content);
  }

  @Delete('notes/:noteId')
  deleteNote(@Param('noteId') noteId: string) {
    return this.partiesService.deleteNote(noteId);
  }

  // Team assignments
  @Post(':id/assign')
  assignTeamMember(@Param('id') id: string, @Body('userId') userId: string) {
    return this.partiesService.assignTeamMember(id, userId);
  }

  @Delete(':id/assign/:userId')
  removeAssignment(@Param('id') id: string, @Param('userId') userId: string) {
    return this.partiesService.removeAssignment(id, userId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER)
  remove(@Param('id') id: string) {
    return this.partiesService.remove(id);
  }
}
