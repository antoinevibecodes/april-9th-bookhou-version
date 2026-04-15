import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StripeGateway } from './gateways/stripe.gateway';
import { SquareGateway } from './gateways/square.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PaymentProcessingService {
  private readonly logger = new Logger(PaymentProcessingService.name);

  constructor(
    private prisma: PrismaService,
    private stripeGateway: StripeGateway,
    private squareGateway: SquareGateway,
    private notifications: NotificationsService,
  ) {}

  // Initiate a card payment (returns client secret for Stripe, or processes directly for Square)
  async initiatePayment(params: {
    partyId: string;
    amount: number; // in dollars
    sourceId?: string; // Square nonce (required for Square)
  }) {
    const party = await this.prisma.party.findUnique({
      where: { id: params.partyId },
      include: {
        location: {
          select: {
            paymentMethod: true,
            stripeSecretKey: true,
            stripePublicKey: true,
            squareAccessToken: true,
            squareLocationId: true,
            squareEnvironment: true,
            currency: true,
            timezone: true,
          },
        },
      },
    });
    if (!party) throw new NotFoundException('Party not found');

    const location = party.location!;
    const amountInCents = Math.round(params.amount * 100);
    const currency = location.currency || 'USD';

    if (location.paymentMethod === 'stripe') {
      if (!location.stripeSecretKey) {
        throw new BadRequestException('Stripe is not configured for this location');
      }

      // Create Stripe customer
      const customerId = await this.stripeGateway.getOrCreateCustomer(
        location.stripeSecretKey,
        party.hostEmail,
        `${party.hostFirstName} ${party.hostLastName}`,
        party.hostPhone,
      );

      // Create payment intent
      const { clientSecret, paymentIntentId } = await this.stripeGateway.createPaymentIntent({
        secretKey: location.stripeSecretKey,
        amount: amountInCents,
        currency,
        customerId,
        description: `Payment for ${party.partyName}`,
        metadata: {
          partyId: party.id,
          invoiceNumber: party.invoiceNumber || '',
        },
      });

      return {
        gateway: 'stripe',
        clientSecret,
        paymentIntentId,
        publicKey: location.stripePublicKey,
      };
    } else if (location.paymentMethod === 'square') {
      if (!location.squareAccessToken || !location.squareLocationId) {
        throw new BadRequestException('Square is not configured for this location');
      }
      if (!params.sourceId) {
        throw new BadRequestException('Source ID (nonce) is required for Square payments');
      }

      // Process payment directly with Square
      const result = await this.squareGateway.processPayment({
        accessToken: location.squareAccessToken,
        environment: location.squareEnvironment || 'sandbox',
        locationId: location.squareLocationId,
        sourceId: params.sourceId,
        amount: amountInCents,
        currency,
        buyerEmail: party.hostEmail,
        note: `Payment for ${party.partyName}`,
        referenceId: party.id,
      });

      // Determine payment type from source (Task #6)
      let paymentType: string = 'CARD';
      if (result.sourceType === 'WALLET' || result.sourceType === 'APPLE_PAY') {
        paymentType = 'APPLE_PAY';
      } else if (result.sourceType === 'CASH_APP') {
        paymentType = 'CASH_APP';
      } else if (result.sourceType !== 'CARD') {
        paymentType = 'SQUARE_OTHER';
      }

      // Record payment in our database
      const payment = await this.prisma.payment.create({
        data: {
          partyId: party.id,
          amount: params.amount,
          type: paymentType as any,
          status: 'PAID',
          squarePaymentId: result.paymentId,
          cardLast4: result.cardLast4,
          cardholderName: result.cardholderName,
          cardBrand: result.cardBrand,
          note: `Square ${result.sourceType} payment #${result.paymentId.slice(-4)}`,
        },
      });

      // Update party balance
      await this.prisma.party.update({
        where: { id: party.id },
        data: {
          amountPaid: { increment: params.amount },
          balance: { decrement: params.amount },
        },
      });

      return {
        gateway: 'square',
        paymentId: result.paymentId,
        status: result.status,
        payment,
      };
    }

    throw new BadRequestException('No payment method configured for this location');
  }

  // Confirm a Stripe payment (called after frontend confirms with client secret)
  async confirmStripePayment(params: {
    partyId: string;
    paymentIntentId: string;
  }) {
    const party = await this.prisma.party.findUnique({
      where: { id: params.partyId },
      include: { location: { select: { stripeSecretKey: true } } },
    });
    if (!party) throw new NotFoundException('Party not found');

    const details = await this.stripeGateway.getPaymentDetails(
      party.location!.stripeSecretKey!,
      params.paymentIntentId,
    );

    if (details.status !== 'succeeded') {
      throw new BadRequestException(`Payment not completed. Status: ${details.status}`);
    }

    const amount = details.amount / 100; // Convert cents to dollars

    // Task #13: Store card details for check-in matching
    const payment = await this.prisma.payment.create({
      data: {
        partyId: party.id,
        amount,
        type: 'CARD',
        status: 'PAID',
        stripePaymentId: params.paymentIntentId,
        cardLast4: details.cardLast4,
        cardholderName: details.cardholderName,
        cardBrand: details.cardBrand,
        note: details.cardLast4
          ? `Card ending ${details.cardLast4} - ${details.cardholderName || 'N/A'}`
          : undefined,
      },
    });

    // Update party balance
    const updatedParty = await this.prisma.party.update({
      where: { id: party.id },
      data: {
        amountPaid: { increment: amount },
        balance: { decrement: amount },
      },
    });

    // Send payment received notification (fire-and-forget)
    this.notifications.paymentReceived(party.id, amount, 'Card').catch((err) =>
      this.logger.warn(`Payment notification failed: ${err.message}`),
    );

    // Check if balance is settled
    const newBalance = Number(updatedParty.balance);
    if (newBalance <= 0) {
      this.notifications.balanceSettled(party.id).catch((err) =>
        this.logger.warn(`Balance settled notification failed: ${err.message}`),
      );
    }

    return { payment, cardDetails: details };
  }

  // Process a gateway refund (Stripe or Square)
  async processGatewayRefund(params: {
    paymentId: string;
    amount: number; // in dollars
    reason?: string;
  }) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: params.paymentId },
      include: {
        party: {
          include: {
            location: {
              select: {
                paymentMethod: true,
                stripeSecretKey: true,
                squareAccessToken: true,
                squareEnvironment: true,
                currency: true,
              },
            },
          },
        },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    const location = payment.party.location!;
    const amountInCents = Math.round(params.amount * 100);

    let gatewayRefundId: string;

    if (payment.stripePaymentId && location.stripeSecretKey) {
      const result = await this.stripeGateway.refund({
        secretKey: location.stripeSecretKey,
        paymentIntentId: payment.stripePaymentId,
        amount: amountInCents,
        reason: params.reason,
      });
      gatewayRefundId = result.refundId;
    } else if (payment.squarePaymentId && location.squareAccessToken) {
      const result = await this.squareGateway.refund({
        accessToken: location.squareAccessToken,
        environment: location.squareEnvironment || 'sandbox',
        paymentId: payment.squarePaymentId,
        amount: amountInCents,
        currency: location.currency || 'USD',
        reason: params.reason,
      });
      gatewayRefundId = result.refundId;
    } else {
      throw new BadRequestException('Cannot process gateway refund: no gateway payment ID found');
    }

    // Update payment record
    await this.prisma.payment.update({
      where: { id: params.paymentId },
      data: {
        refundedAmount: { increment: params.amount },
        refundedAt: new Date(),
        refundReason: params.reason,
      },
    });

    // Create refund transaction record (Task #9: refunds visible)
    const refundRecord = await this.prisma.payment.create({
      data: {
        partyId: payment.partyId,
        amount: params.amount,
        type: payment.type,
        status: 'REFUND',
        note: `Refund: ${params.reason || 'Customer requested'}`,
        cardLast4: payment.cardLast4,
        cardholderName: payment.cardholderName,
      },
    });

    // Update party totals (Task #8)
    await this.prisma.party.update({
      where: { id: payment.partyId },
      data: {
        amountRefunded: { increment: params.amount },
        amountPaid: { decrement: params.amount },
        balance: { increment: params.amount },
      },
    });

    // Send refund notification (fire-and-forget)
    this.notifications.paymentRefunded(payment.partyId, params.amount).catch((err) =>
      this.logger.warn(`Refund notification failed: ${err.message}`),
    );

    return {
      gatewayRefundId,
      refundRecord,
    };
  }
}
