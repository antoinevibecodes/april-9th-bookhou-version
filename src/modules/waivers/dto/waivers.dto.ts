import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateWaiverTemplateDto {
  @ApiProperty()
  @IsString()
  locationId: string;

  @ApiProperty({ example: 'Standard Party Waiver' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Waiver HTML content' })
  @IsString()
  content: string;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateWaiverTemplateDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class WaiverQuestionDto {
  @ApiProperty({ example: 'Does your child have any allergies?' })
  @IsString()
  question: string;

  @ApiProperty({ enum: ['text', 'select', 'checkbox'], default: 'text' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ required: false, description: 'Options for select/checkbox types' })
  @IsOptional()
  options?: any;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

export class MinorInfoDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  age?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  relationship?: string;
}

// Task #23: Waiver signing - opens directly, no login required
// Task #24: Guest must sign waiver and get copy for check-in
export class SignWaiverDto {
  @ApiProperty()
  @IsString()
  partyId: string;

  @ApiProperty()
  @IsString()
  templateId: string;

  @ApiProperty({ example: 'Kevin Boston' })
  @IsString()
  signerName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  signerEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  signerPhone?: string;

  @ApiProperty({ required: false, description: 'Base64 signature image' })
  @IsOptional()
  @IsString()
  signatureData?: string;

  @ApiProperty({ required: false, description: 'Answers to waiver questions' })
  @IsOptional()
  answers?: any;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  isHost?: boolean;

  @ApiProperty({ required: false, type: [MinorInfoDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MinorInfoDto)
  minors?: MinorInfoDto[];
}
