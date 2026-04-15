import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateLocationDto {
  @ApiProperty()
  @IsString()
  businessId: string;

  @ApiProperty({ example: 'Tiny Towne Norcross' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'tinytowne-norcross' })
  @IsString()
  prefix: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ example: 'America/New_York', description: 'IANA timezone (Task #1)' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ example: 'USD', required: false })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class UpdateLocationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bookingPageTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bookingPageDesc?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  refundPolicy?: string;
}

export class SetPaymentMethodDto {
  @ApiProperty({ enum: ['stripe', 'square'], description: 'Active payment method' })
  @IsEnum(['stripe', 'square'])
  paymentMethod: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  stripeSecretKey?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  stripePublicKey?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  squareAccessToken?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  squareLocationId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  squareAppId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(['sandbox', 'production'])
  squareEnvironment?: string;
}

export class WorkHoursDto {
  @ApiProperty({ example: 0, description: '0=Sunday, 6=Saturday' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ example: '09:00' })
  @IsString()
  openTime: string;

  @ApiProperty({ example: '21:00' })
  @IsString()
  closeTime: string;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;
}

export class OffDayDto {
  @ApiProperty({ example: '2026-12-25' })
  @IsDateString()
  date: string;

  @ApiProperty({ required: false, example: 'Christmas Day' })
  @IsOptional()
  @IsString()
  reason?: string;
}

// Task #19: Tax as percentage, not flat amount
export class CreateTaxDto {
  @ApiProperty({ example: 'Sales Tax' })
  @IsString()
  name: string;

  @ApiProperty({ example: 0.06, description: 'Tax rate as decimal (0.06 = 6%)' })
  @IsNumber()
  @Type(() => Number)
  rate: number;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
