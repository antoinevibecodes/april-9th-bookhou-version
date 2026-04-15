import { Injectable, BadRequestException } from '@nestjs/common';
import { SquareClient, SquareEnvironment } from 'square';

// Task #6: Square integration for Apple Pay, Cash App, etc.
@Injectable()
export class SquareGateway {
  private getClient(accessToken: string, environment: string): SquareClient {
    return new SquareClient({
      token: accessToken,
      environment: environment === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
    });
  }

  // Process payment with nonce (from Square Web Payments SDK)
  async processPayment(params: {
    accessToken: string;
    environment: string;
    locationId: string;
    sourceId: string;
    amount: number; // in cents
    currency: string;
    buyerEmail?: string;
    note?: string;
    referenceId?: string;
  }): Promise<{
    paymentId: string;
    status: string;
    cardLast4: string | null;
    cardholderName: string | null;
    cardBrand: string | null;
    sourceType: string | null;
  }> {
    const client = this.getClient(params.accessToken, params.environment);

    try {
      const response = await client.payments.create({
        sourceId: params.sourceId,
        idempotencyKey: `${params.referenceId || Date.now()}-${Math.random().toString(36).slice(2)}`,
        amountMoney: {
          amount: BigInt(params.amount),
          currency: params.currency as any,
        },
        locationId: params.locationId,
        buyerEmailAddress: params.buyerEmail,
        note: params.note,
        referenceId: params.referenceId,
      });

      const payment = response as any;

      return {
        paymentId: payment.id || '',
        status: payment.status || 'COMPLETED',
        cardLast4: payment.cardDetails?.card?.last4 || null,
        cardholderName: payment.cardDetails?.card?.cardholderName || null,
        cardBrand: payment.cardDetails?.card?.cardBrand || null,
        sourceType: payment.sourceType || null,
      };
    } catch (error: any) {
      const message = error.errors?.[0]?.detail || error.message;
      throw new BadRequestException(`Square payment failed: ${message}`);
    }
  }

  // Refund a Square payment
  async refund(params: {
    accessToken: string;
    environment: string;
    paymentId: string;
    amount: number;
    currency: string;
    reason?: string;
  }): Promise<{
    refundId: string;
    status: string;
    amount: number;
  }> {
    const client = this.getClient(params.accessToken, params.environment);

    try {
      const response = await client.refunds.refundPayment({
        idempotencyKey: `refund-${params.paymentId}-${Date.now()}`,
        paymentId: params.paymentId,
        amountMoney: {
          amount: BigInt(params.amount),
          currency: params.currency as any,
        },
        reason: params.reason,
      });

      const refund = response as any;

      return {
        refundId: refund.id || '',
        status: refund.status || 'COMPLETED',
        amount: Number(refund.amountMoney?.amount || 0),
      };
    } catch (error: any) {
      const message = error.errors?.[0]?.detail || error.message;
      throw new BadRequestException(`Square refund failed: ${message}`);
    }
  }

  // Get payment details
  async getPayment(params: {
    accessToken: string;
    environment: string;
    paymentId: string;
  }) {
    const client = this.getClient(params.accessToken, params.environment);

    const response = await client.payments.get({ paymentId: params.paymentId }) as any;

    return {
      id: response.id,
      status: response.status,
      amount: Number(response.amountMoney?.amount || 0),
      sourceType: response.sourceType,
      cardLast4: response.cardDetails?.card?.last4,
      cardholderName: response.cardDetails?.card?.cardholderName,
      cardBrand: response.cardDetails?.card?.cardBrand,
      createdAt: response.createdAt,
    };
  }
}
