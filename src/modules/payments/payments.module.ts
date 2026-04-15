import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentProcessingService } from './payment-processing.service';
import { StripeGateway } from './gateways/stripe.gateway';
import { SquareGateway } from './gateways/square.gateway';
import { WebhookController } from './webhook.controller';

@Module({
  controllers: [PaymentsController, WebhookController],
  providers: [PaymentsService, PaymentProcessingService, StripeGateway, SquareGateway],
  exports: [PaymentsService, PaymentProcessingService, StripeGateway, SquareGateway],
})
export class PaymentsModule {}
