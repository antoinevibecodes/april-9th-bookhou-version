import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsInt,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EventType } from '@prisma/client';

export class TimeSlotDto {
  @ApiProperty({ example: 1, description: '0=Sunday, 6=Saturday' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ example: '10:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '12:00' })
  @IsString()
  endTime: string;
}

export class CreatePackageDto {
  @ApiProperty()
  @IsString()
  locationId: string;

  @ApiProperty({ example: 'Plus Package' })
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, example: '2 pizzas, 10 credits, drinks', description: 'Task #18: package contents for invoice' })
  @IsOptional()
  @IsString()
  contents?: string;

  @ApiProperty({ example: 350 })
  @IsNumber()
  @Type(() => Number)
  price: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  cost?: number;

  @ApiProperty({ required: false, example: 15, description: 'Extra charge per additional guest (Task #17: field trips)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  extraPerPersonPrice?: number;

  @ApiProperty({ example: 120, description: 'Duration in minutes' })
  @IsInt()
  duration: number;

  @ApiProperty({ example: 30, description: 'Buffer time between parties in minutes' })
  @IsOptional()
  @IsInt()
  bufferTime?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  minGuests?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  maxGuests?: number;

  @ApiProperty({ required: false, example: '#FF5733' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ enum: EventType, default: EventType.BIRTHDAY })
  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @ApiProperty({ required: false, type: [String], description: 'Room IDs this package can use' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roomIds?: string[];

  @ApiProperty({ required: false, type: [TimeSlotDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  timeSlots?: TimeSlotDto[];
}

export class UpdatePackageDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contents?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  price?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  cost?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  extraPerPersonPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  duration?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  bufferTime?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  minGuests?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  maxGuests?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roomIds?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  timeSlots?: TimeSlotDto[];
}

export class ReorderDto {
  @ApiProperty({ type: [String], description: 'Ordered array of IDs' })
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
