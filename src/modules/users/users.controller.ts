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
import { UsersService } from './users.service';
import { CreateTeamMemberDto, UpdateTeamMemberDto, ChangeRoleDto } from './dto/users.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users / Team Members')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('team-members')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER)
  create(@Body() dto: CreateTeamMemberDto) {
    return this.usersService.createTeamMember(dto);
  }

  @Get()
  findAll(@Query('locationId') locationId: string) {
    return this.usersService.findTeamMembers(locationId);
  }

  @Get('my-locations')
  getMyLocations(@CurrentUser('id') userId: string) {
    return this.usersService.getUserLocations(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateTeamMemberDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/role')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER)
  changeRole(
    @Param('id') id: string,
    @Query('locationId') locationId: string,
    @Body() dto: ChangeRoleDto,
  ) {
    return this.usersService.changeRole(id, locationId, dto);
  }

  @Patch(':id/toggle-status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER)
  toggleStatus(@Param('id') id: string) {
    return this.usersService.toggleStatus(id);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER)
  remove(@Param('id') id: string, @Query('locationId') locationId: string) {
    return this.usersService.remove(id, locationId);
  }
}
