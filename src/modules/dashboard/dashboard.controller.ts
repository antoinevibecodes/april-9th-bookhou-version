import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { RequirePermission, PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get()
  getDashboard(@Query('locationId') locationId: string) {
    return this.dashboardService.getDashboard(locationId);
  }

  // Task #9: Revenue totals - restricted from employees and business admin
  @Get('revenue')
  @UseGuards(PermissionsGuard)
  @RequirePermission('view_revenue')
  getRevenue(@Query('locationId') locationId: string) {
    return this.dashboardService.getRevenueInfo(locationId);
  }
}
