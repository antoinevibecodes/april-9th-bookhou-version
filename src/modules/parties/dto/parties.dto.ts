import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsInt,
  IsDateString,
  IsArray,
  ValidateNested,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PartyStatus, EventType, RefundType } from '@prisma/client';

export class PartyAddonDto {
  @ApiProperty({ required: false, description: 'Existing addon ID (null for custom)' })
  @IsOptional()
  @IsString()
  addonId?: string;

  @ApiProperty({ required: false, description: 'Task #10: Custom addon name' })
  @IsOptional()
  @IsString()
  customName?: string;

  @ApiProperty({ required: false, description: 'Task #10: Custom addon description' })
  @IsOptional()
  @IsString()
  customDesc?: string;

  @ApiProperty({ example: 25.0 })
  @IsNumber()
  @Type(() => Number)
  price: number;

  @ApiProperty({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class CreatePartyDto {
  @ApiProperty()
  @IsString()
  locationId: string;

  @ApiProperty()
  @IsString()
  packageId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiProperty({ enum: EventType, default: EventType.BIRTHDAY })
  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  // Host info
  @ApiProperty({ example: 'Kevin' })
  @IsString()
  hostFirstName: string;

  @ApiProperty({ example: 'Boston' })
  @IsString()
  hostLastName: string;

  @ApiProperty({ example: 'kevin@example.com' })
  @IsString()
  hostEmail: string;

  @ApiProperty({ example: '+14045551234' })
  @IsString()
  hostPhone: string;

  // Event info
  @ApiProperty({ required: false, example: 'KJ' })
  @IsOptional()
  @IsString()
  childName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  childDob?: string;

  @ApiProperty({ example: "KJ's 5th Birthday Party" })
  @IsString()
  partyName: string;

  @ApiProperty({ example: '2026-03-23' })
  @IsDateString()
  partyDate: string;

  @ApiProperty({ example: '14:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '16:00' })
  @IsString()
  endTime: string;

  @ApiProperty({ example: 16 })
  @IsInt()
  @Min(1)
  guestCount: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bannerUrl?: string;

  // Addons (Task #10: supports custom amounts)
  @ApiProperty({ required: false, type: [PartyAddonDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartyAddonDto)
  addons?: PartyAddonDto[];

  // Coupon
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  couponCode?: string;
}

export class UpdatePartyDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  packageId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  hostFirstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  hostLastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  hostEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  hostPhone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  childName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  partyName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  partyDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  guestCount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bannerUrl?: string;

  // Task #17: Field trip extra person pricing update
  @ApiProperty({ required: false, type: [PartyAddonDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartyAddonDto)
  addons?: PartyAddonDto[];
}

export class ChangeStatusDto {
  @ApiProperty({ enum: PartyStatus })
  @IsEnum(PartyStatus)
  status: PartyStatus;
}

// Task #7: Cancellation with exact refund amount (not just percentage)
export class CancelPartyDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ enum: RefundType, description: 'PERCENTAGE or FIXED_AMOUNT' })
  @IsEnum(RefundType)
  refundType: RefundType;

  @ApiProperty({ example: 75, description: 'If FIXED_AMOUNT: dollar amount to keep as fee. If PERCENTAGE: refund percentage.' })
  @IsNumber()
  @Type(() => Number)
  refundValue: number;
}

export class PartyFilterDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiProperty({ required: false, enum: PartyStatus })
  @IsOptional()
  @IsEnum(PartyStatus)
  status?: PartyStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number;
}
