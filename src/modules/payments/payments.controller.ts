import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PaymentProcessingService } from './payment-processing.service';
import {
  CreatePaymentDto,
  CreateTipDto,
  RefundPaymentDto,
  TransactionFilterDto,
} from './dto/payments.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  RequirePermission,
  PermissionsGuard,
} from '../../common/guards/permissions.guard';

@ApiTags('Payments & Transactions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private paymentProcessing: PaymentProcessingService,
  ) {}

  @Post()
  createPayment(@Body() dto: CreatePaymentDto, @CurrentUser('id') userId: string) {
    return this.paymentsService.createPayment(dto, userId);
  }

  @Post('tip')
  createTip(@Body() dto: CreateTipDto, @CurrentUser('id') userId: string) {
    return this.paymentsService.createTip(dto, userId);
  }

  // Task #6, #8: Refund processing
  @Post('refund')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER)
  refundPayment(@Body() dto: RefundPaymentDto, @CurrentUser('id') userId: string) {
    return this.paymentsService.refundPayment(dto, userId);
  }

  @Get('refund-check/:partyId')
  checkRefundAmount(@Param('partyId') partyId: string) {
    return this.paymentsService.checkRefundAmount(partyId);
  }

  // Task #2: Transaction list with filters
  @Get('transactions')
  @UseGuards(PermissionsGuard)
  @RequirePermission('view_total_sales')
  findTransactions(@Query() filters: TransactionFilterDto) {
    return this.paymentsService.findTransactions(filters);
  }

  @Get('party/:partyId')
  getPartyPayments(@Param('partyId') partyId: string) {
    return this.paymentsService.getPartyPayments(partyId);
  }

  // Gateway payment processing
  @Post('process')
  initiatePayment(
    @Body() data: { partyId: string; amount: number; sourceId?: string },
  ) {
    return this.paymentProcessing.initiatePayment(data);
  }

  @Post('confirm-stripe')
  confirmStripePayment(
    @Body() data: { partyId: string; paymentIntentId: string },
  ) {
    return this.paymentProcessing.confirmStripePayment(data);
  }

  @Post('gateway-refund')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER)
  processGatewayRefund(
    @Body() data: { paymentId: string; amount: number; reason?: string },
  ) {
    return this.paymentProcessing.processGatewayRefund(data);
  }
}
