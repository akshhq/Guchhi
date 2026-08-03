import prisma from '../config/db';
import razorpay from '../config/razorpay';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

export const RefundService = {
  /**
   * Refunds the full amount paid for an order via Razorpay. Only ever
   * touches orders paid online — COD orders have nothing to refund through
   * a payment gateway, and orders that already show REFUNDED are left
   * alone rather than double-refunding.
   */
  async refundOrderPayment(orderId: string, reason: string) {
    const payment = await prisma.payment.findUnique({ where: { orderId } });
    if (!payment) throw ApiError.notFound('No payment record found for this order');

    if (payment.method !== PaymentMethod.RAZORPAY) {
      // COD or any future non-gateway method — nothing to refund through Razorpay.
      return { refunded: false, reason: 'Order was not paid via Razorpay; no gateway refund needed' };
    }
    if (payment.status === PaymentStatus.REFUNDED) {
      return { refunded: false, reason: 'Already refunded' };
    }
    if (payment.status !== PaymentStatus.PAID) {
      throw ApiError.badRequest(`Cannot refund a payment with status "${payment.status}"`);
    }
    if (!payment.razorpayPaymentId) {
      throw ApiError.badRequest('Payment is missing a Razorpay payment id');
    }

    try {
      const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
        // Razorpay expects the amount in the smallest currency unit (paise).
        amount: Math.round(Number(payment.amount) * 100),
        notes: { reason, orderId },
      });

      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.REFUNDED, refundId: refund.id, refundedAt: new Date() },
      });

      logger.info('Razorpay refund issued', { orderId, paymentId: payment.id, refundId: refund.id });
      return { refunded: true, refundId: refund.id };
    } catch (err) {
      logger.error('Razorpay refund failed', { orderId, paymentId: payment.id, error: (err as Error).message });
      throw ApiError.internal('Refund could not be processed. Please try again or contact support.');
    }
  },
};
