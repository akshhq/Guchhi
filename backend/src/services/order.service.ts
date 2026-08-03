import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';
import { getPagination, buildMeta } from '../utils/pagination';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { sendMail } from '../emails/mailer';
import { shippingUpdateEmail } from '../emails/templates';
import { RefundService } from './refund.service';
import { logger } from '../utils/logger';

const CANCELLABLE_STATUSES: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING];

export const OrderService = {
  async listForUser(userId: string, query: { page?: string; limit?: string; status?: string }) {
    const { page, limit, skip } = getPagination(query);
    const where = { userId, ...(query.status ? { status: query.status as OrderStatus } : {}) };
    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true, payment: true },
      }),
      prisma.order.count({ where }),
    ]);
    return { items, meta: buildMeta(page, limit, total) };
  },

  async getById(orderId: string, userId?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payment: true,
        shippingAddress: true,
        billingAddress: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        coupon: true,
      },
    });
    if (!order) throw ApiError.notFound('Order not found');
    if (userId && order.userId !== userId) throw ApiError.forbidden('You cannot view this order');
    return order;
  },

  async cancel(orderId: string, userId: string, reason: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw ApiError.notFound('Order not found');
    if (order.userId !== userId) throw ApiError.forbidden('You cannot cancel this order');
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      throw ApiError.badRequest(`Orders with status "${order.status}" can no longer be cancelled`);
    }

    const cancelledOrder = await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
        await tx.inventoryLog.create({
          data: { productId: item.productId, action: 'STOCK_IN', quantity: item.quantity, orderId, reason: 'Order cancelled' },
        });
      }
      return tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          cancelReason: reason,
          statusHistory: { create: { status: OrderStatus.CANCELLED, note: reason } },
        },
      });
    });

    const payment = await prisma.payment.findUnique({ where: { orderId } });
    if (payment && payment.method === PaymentMethod.RAZORPAY && payment.status === PaymentStatus.PAID) {
      try {
        await RefundService.refundOrderPayment(orderId, `Order cancelled: ${reason}`);
      } catch (err) {
        // The cancellation itself already succeeded and shouldn't be rolled
        // back over a refund hiccup — log it clearly for manual follow-up
        // rather than leaving the customer's cancellation in limbo.
        logger.error('Auto-refund on cancellation failed; needs manual follow-up', {
          orderId,
          error: (err as Error).message,
        });
      }
    }

    return cancelledOrder;
  },

  // ---------------- Admin ----------------

  async listAllForAdmin(query: { page?: string; limit?: string; status?: string; search?: string }) {
    const { page, limit, skip } = getPagination(query);
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        { guestEmail: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true, payment: true, user: { select: { firstName: true, lastName: true, email: true } } },
      }),
      prisma.order.count({ where }),
    ]);
    return { items, meta: buildMeta(page, limit, total) };
  },

  async updateStatus(orderId: string, status: OrderStatus, note?: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { user: true } });
    if (!order) throw ApiError.notFound('Order not found');

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status, statusHistory: { create: { status, note } } },
    });

    const email = order.user?.email || order.guestEmail;
    const name = order.user?.firstName || 'there';
    if (email) sendMail(email, `Order ${order.orderNumber} — ${status}`, shippingUpdateEmail(name, order.orderNumber, status));

    return updated;
  },

  async getInvoiceData(orderId: string) {
    // Placeholder: returns structured invoice data. A PDF renderer can be
    // wired in later (e.g. via the pdf skill / a dedicated invoice service)
    // without changing this contract.
    const order = await this.getById(orderId);
    return {
      invoiceNumber: `INV-${order.orderNumber}`,
      issuedAt: order.createdAt,
      order,
    };
  },
};
