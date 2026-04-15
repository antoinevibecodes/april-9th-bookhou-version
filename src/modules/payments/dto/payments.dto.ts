import { IsString, IsOptional, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaymentType, PaymentStatus } from '@prisma/client';

export class CreatePaymentDto {
  @ApiProperty()
  @IsString()
  partyId: string;

  @ApiProperty({ example: 424.0 })
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @ApiProperty({ enum: PaymentType, description: 'Task #6: CARD, CASH, APPLE_PAY, CASH_APP, SQUARE_OTHER' })
  @IsEnum(PaymentType)
  type: PaymentType;

  @ApiProperty({ enum: PaymentStatus, default: PaymentStatus.PAID })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiProperty({ required: false, description: 'Task #5: Payment note (e.g. "paid on square #pQ2s")' })
  @IsOptional()
  @IsString()
  note?: string;

  // Task #13: Card details for check-in matching
  @ApiProperty({ required: false, example: '4242', description: 'Task #13: Last 4 digits of card' })
  @IsOptional()
  @IsString()
  cardLast4?: string;

  @ApiProperty({ required: false, example: 'Kevin Boston', description: 'Task #13: Cardholder name' })
  @IsOptional()
  @IsString()
  cardholderName?: string;

  @ApiProperty({ required: false, example: 'visa' })
  @IsOptional()
  @IsString()
  cardBrand?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  stripePaymentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  squarePaymentId?: string;
}

export class CreateTipDto {
  @ApiProperty()
  @IsString()
  partyId: string;

  @ApiProperty({ example: 20.0 })
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @ApiProperty({ enum: PaymentType })
  @IsEnum(PaymentType)
  type: PaymentType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

// Task #8: Refund with proper tracking
export class RefundPaymentDto {
  @ApiProperty()
  @IsString()
  paymentId: string;

  @ApiProperty({ example: 189.48, description: 'Amount to refund' })
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

// Task #2: Transaction filters
export class TransactionFilterDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiProperty({ required: false, enum: ['today', 'yesterday', 'custom'] })
  @IsOptional()
  @IsString()
  dateFilter?: 'today' | 'yesterday' | 'custom';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiProperty({ required: false, enum: ['all', 'CARD', 'CASH', 'APPLE_PAY', 'CASH_APP', 'SQUARE_OTHER'] })
  @IsOptional()
  @IsString()
  paymentType?: string;

  @ApiProperty({ required: false, enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
