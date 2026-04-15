import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BusinessModule } from './modules/business/business.module';
import { LocationsModule } from './modules/locations/locations.module';
import { PackagesModule } from './modules/packages/packages.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { AddonsModule } from './modules/addons/addons.module';
import { PartiesModule } from './modules/parties/parties.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { WaiversModule } from './modules/waivers/waivers.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EmailModule } from './modules/email/email.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { BookingModule } from './modules/booking/booking.module';
import { SmsModule } from './modules/sms/sms.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    SmsModule,
    CalendarModule,
    AuthModule,
    UsersModule,
    BusinessModule,
    LocationsModule,
    PackagesModule,
    RoomsModule,
    AddonsModule,
    PartiesModule,
    PaymentsModule,
    InvitationsModule,
    WaiversModule,
    CouponsModule,
    ReportsModule,
    DashboardModule,
    EmailModule,
    InvoicesModule,
    UploadsModule,
    BookingModule,
    NotificationsModule,
  ],
})
export class AppModule {}
