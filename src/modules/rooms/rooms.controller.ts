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
import { RoomsService } from './rooms.service';
import { CreateRoomDto, UpdateRoomDto, ReorderRoomsDto } from './dto/rooms.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Rooms')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER)
  create(@Body() dto: CreateRoomDto) {
    return this.roomsService.create(dto);
  }

  @Get()
  findAll(@Query('locationId') locationId: string) {
    return this.roomsService.findAll(locationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }

  @Get(':id/availability')
  checkAvailability(
    @Param('id') id: string,
    @Query('date') date: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Query('excludePartyId') excludePartyId?: string,
  ) {
    return this.roomsService.checkAvailability(id, new Date(date), startTime, endTime, excludePartyId);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.roomsService.update(id, dto);
  }

  @Post('reorder')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER)
  reorder(@Body() dto: ReorderRoomsDto) {
    return this.roomsService.reorder(dto.ids);
  }

  @Post(':id/files')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER)
  addFile(@Param('id') id: string, @Body('fileUrl') fileUrl: string) {
    return this.roomsService.addFile(id, fileUrl);
  }

  @Delete('files/:fileId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER)
  removeFile(@Param('fileId') fileId: string) {
    return this.roomsService.removeFile(fileId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER)
  remove(@Param('id') id: string) {
    return this.roomsService.remove(id);
  }
}
