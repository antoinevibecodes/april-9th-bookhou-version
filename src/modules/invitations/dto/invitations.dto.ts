import { IsString, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { InvitationMethod } from '@prisma/client';

export class InvitationGuestDto {
  @ApiProperty({ example: 'Jane Smith' })
  @IsString()
  guestName: string;

  @ApiProperty({ required: false, example: 'jane@example.com' })
  @IsOptional()
  @IsString()
  guestEmail?: string;

  @ApiProperty({ required: false, example: '+14045559876', description: 'Task #12: SMS invitation support' })
  @IsOptional()
  @IsString()
  guestPhone?: string;

  @ApiProperty({ enum: InvitationMethod, default: InvitationMethod.EMAIL })
  @IsOptional()
  @IsEnum(InvitationMethod)
  method?: InvitationMethod;
}

export class SendInvitationsDto {
  @ApiProperty()
  @IsString()
  partyId: string;

  @ApiProperty({ type: [InvitationGuestDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvitationGuestDto)
  guests: InvitationGuestDto[];
}

export class RsvpDto {
  @ApiProperty({ enum: ['YES', 'NO', 'MAYBE'] })
  @IsEnum(['YES', 'NO', 'MAYBE'])
  status: 'YES' | 'NO' | 'MAYBE';
}
