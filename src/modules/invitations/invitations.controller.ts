import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { SendInvitationsDto, RsvpDto } from './dto/invitations.dto';

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private invitationsService: InvitationsService) {}

  // Protected endpoints
  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  send(@Body() dto: SendInvitationsDto) {
    return this.invitationsService.sendInvitations(dto);
  }

  @Get('party/:partyId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  findByParty(@Param('partyId') partyId: string) {
    return this.invitationsService.findByParty(partyId);
  }

  @Post(':id/resend')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  resend(@Param('id') id: string) {
    return this.invitationsService.resend(id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.invitationsService.remove(id);
  }

  // Public endpoint - RSVP (Task #22)
  @Post(':id/rsvp')
  rsvp(@Param('id') id: string, @Body() dto: RsvpDto) {
    return this.invitationsService.rsvp(id, dto);
  }
}
