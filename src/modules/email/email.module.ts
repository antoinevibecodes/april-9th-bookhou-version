import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { MailService } from './mail.service';

@Module({
  controllers: [EmailController],
  providers: [EmailService, MailService],
  exports: [EmailService, MailService],
})
export class EmailModule {}
