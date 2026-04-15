import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BookingService } from './booking.service';

// Public endpoints — no auth required
// These power the customer-facing booking page
@ApiTags('Public Booking')
@Controller('booking')
export class BookingController {
  constructor(private bookingService: BookingService) {}

  // Get booking page data for a location
  @Get('page/:locationPrefix')
  getBookingPage(@Param('locationPrefix') prefix: string) {
    return this.bookingService.getBookingPage(prefix);
  }

  // Get addons for a package
  @Get('addons/:packageId')
  getPackageAddons(@Param('packageId') packageId: string) {
    return this.bookingService.getPackageAddons(packageId);
  }

  // Check date availability
  @Get('availability')
  checkAvailability(
    @Query('locationId') locationId: string,
    @Query('date') date: string,
    @Query('packageId') packageId: string,
  ) {
    return this.bookingService.checkAvailability(locationId, date, packageId);
  }

  // Task #14: Booking detail page (link from email must work)
  @Get('details/:partyId')
  getBookingDetails(@Param('partyId') partyId: string) {
    return this.bookingService.getBookingDetails(partyId);
  }
}
