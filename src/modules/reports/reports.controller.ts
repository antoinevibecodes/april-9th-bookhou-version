import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { RequirePermission, PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  // Task #4: Employees cannot access reports
  @Get('payments')
  @RequirePermission('view_total_sales', 'print_reports')
  getPaymentReport(
    @Query('locationId') locationId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('paymentType') paymentType?: string,
    @Query('teamMemberId') teamMemberId?: string,
  ) {
    return this.reportsService.getPaymentReport({ locationId, dateFrom, dateTo, paymentType, teamMemberId });
  }

  @Get('parties')
  @RequirePermission('view_analytics')
  getPartyReport(
    @Query('locationId') locationId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('packageId') packageId?: string,
    @Query('eventType') eventType?: string,
  ) {
    return this.reportsService.getPartyReport({ locationId, dateFrom, dateTo, packageId, eventType });
  }

  // Task #20: Tax totals for IRS
  @Get('taxes')
  @RequirePermission('view_total_sales')
  getTaxReport(
    @Query('locationId') locationId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.reportsService.getTaxReport({ locationId, dateFrom, dateTo });
  }
}
