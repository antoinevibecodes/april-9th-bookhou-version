import { Controller, Post, Req, Res, Headers } from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { StripeGateway } from './gateways/stripe.gateway';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private stripeGateway: StripeGateway,
  ) {}

  @Post('stripe')
  @ApiExcludeEndpoint()
  async handleStripeWebhook(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('stripe-signature') signature: string,
  ) {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      return res.status(400).json({ error: 'Webhook secret not configured' });
    }

    let event;
    try {
      event = this.stripeGateway.verifyWebhookSignature(
        req.body as Buffer,
        signature,
        webhookSecret,
      );
    } catch (err: any) {
      return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
    }

    // Handle relevant events
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as any;
        const partyId = paymentIntent.metadata?.partyId;
        if (partyId) {
          // Check if already recorded (idempotency)
          const existing = await this.prisma.payment.findFirst({
            where: { stripePaymentId: paymentIntent.id },
          });
          if (!existing) {
            // Auto-record if not already confirmed via API
            const amount = paymentIntent.amount / 100;
            await this.prisma.payment.create({
              data: {
                partyId,
                amount,
                type: 'CARD',
                status: 'PAID',
                stripePaymentId: paymentIntent.id,
                note: `Stripe webhook: payment confirmed`,
              },
            });
            await this.prisma.party.update({
              where: { id: partyId },
              data: {
                amountPaid: { increment: amount },
                balance: { decrement: amount },
              },
            });
          }
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as any;
        // Log refund from Stripe side
        console.log(`Stripe refund received for charge ${charge.id}`);
        break;
      }

      default:
        // Unhandled event type
        break;
    }

    return res.json({ received: true });
  }
}
