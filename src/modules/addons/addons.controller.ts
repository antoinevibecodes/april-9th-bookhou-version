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
import { AddonsService } from './addons.service';
import { CreateAddonDto, UpdateAddonDto, ReorderAddonsDto } from './dto/addons.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Addons')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('addons')
export class AddonsController {
  constructor(private addonsService: AddonsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER)
  create(@Body() dto: CreateAddonDto) {
    return this.addonsService.create(dto);
  }

  @Get()
  findAll(@Query('locationId') locationId: string) {
    return this.addonsService.findAll(locationId);
  }

  @Get('for-package/:packageId')
  findByPackage(@Param('packageId') packageId: string) {
    return this.addonsService.findByPackage(packageId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.addonsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateAddonDto) {
    return this.addonsService.update(id, dto);
  }

  @Post('reorder')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER)
  reorder(@Body() dto: ReorderAddonsDto) {
    return this.addonsService.reorder(dto.ids);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER)
  remove(@Param('id') id: string) {
    return this.addonsService.remove(id);
  }
}
