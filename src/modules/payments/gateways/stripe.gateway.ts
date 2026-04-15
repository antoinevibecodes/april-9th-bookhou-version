import { Injectable, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeGateway {
  private getClient(secretKey: string): Stripe {
    return new Stripe(secretKey);
  }

  // Create or retrieve a Stripe customer
  async getOrCreateCustomer(
    secretKey: string,
    email: string,
    name: string,
    phone?: string,
  ): Promise<string> {
    const stripe = this.getClient(secretKey);

    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data.length > 0) {
      return existing.data[0].id;
    }

    const customer = await stripe.customers.create({ email, name, phone });
    return customer.id;
  }

  // Create a payment intent (for card payments)
  async createPaymentIntent(params: {
    secretKey: string;
    amount: number; // in cents
    currency: string;
    customerId?: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<{
    clientSecret: string;
    paymentIntentId: string;
  }> {
    const stripe = this.getClient(params.secretKey);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      customer: params.customerId,
      description: params.description,
      metadata: params.metadata,
      automatic_payment_methods: { enabled: true },
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };
  }

  // Confirm payment and get card details (Task #13: last 4 + cardholder name)
  async getPaymentDetails(
    secretKey: string,
    paymentIntentId: string,
  ): Promise<{
    status: string;
    amount: number;
    cardLast4: string | null;
    cardholderName: string | null;
    cardBrand: string | null;
  }> {
    const stripe = this.getClient(secretKey);

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['payment_method'],
    });

    const pm = pi.payment_method as Stripe.PaymentMethod | null;
    const card = pm?.card;

    return {
      status: pi.status,
      amount: pi.amount,
      cardLast4: card?.last4 || null,
      cardholderName: pm?.billing_details?.name || null,
      cardBrand: card?.brand || null,
    };
  }

  // Process refund (Task #5, #6, #8)
  async refund(params: {
    secretKey: string;
    paymentIntentId: string;
    amount?: number; // in cents, partial refund. omit for full refund
    reason?: string;
  }): Promise<{
    refundId: string;
    amount: number;
    status: string;
  }> {
    const stripe = this.getClient(params.secretKey);

    try {
      const refund = await stripe.refunds.create({
        payment_intent: params.paymentIntentId,
        amount: params.amount,
        reason: 'requested_by_customer',
        metadata: params.reason ? { reason: params.reason } : undefined,
      });

      return {
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status || 'succeeded',
      };
    } catch (error: any) {
      throw new BadRequestException(`Stripe refund failed: ${error.message}`);
    }
  }

  // Charge a saved card (for balance payments)
  async chargeCustomer(params: {
    secretKey: string;
    customerId: string;
    amount: number; // in cents
    currency: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<{
    paymentIntentId: string;
    status: string;
  }> {
    const stripe = this.getClient(params.secretKey);

    // Get customer's default payment method
    const customer = await stripe.customers.retrieve(params.customerId) as Stripe.Customer;
    const defaultPm = customer.invoice_settings?.default_payment_method;

    if (!defaultPm) {
      throw new BadRequestException('Customer has no saved payment method');
    }

    const pi = await stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      customer: params.customerId,
      payment_method: defaultPm as string,
      off_session: true,
      confirm: true,
      description: params.description,
      metadata: params.metadata,
    });

    return {
      paymentIntentId: pi.id,
      status: pi.status,
    };
  }

  // Webhook signature verification
  verifyWebhookSignature(
    payload: Buffer,
    signature: string,
    webhookSecret: string,
  ): Stripe.Event {
    const stripe = this.getClient(''); // key not needed for webhook verification
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}
