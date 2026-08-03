import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';
import { OrderStatus } from '@prisma/client';

export const ReviewService = {
  async listForProduct(productId: string) {
    return prisma.review.findMany({
      where: { productId, isApproved: true },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(userId: string, productId: string, data: { rating: number; title?: string; comment?: string; images?: string[] }) {
    const existing = await prisma.review.findUnique({ where: { productId_userId: { productId, userId } } });
    if (existing) throw ApiError.conflict('You have already reviewed this product');

    const verifiedPurchase = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: { userId, status: { in: [OrderStatus.DELIVERED, OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.PROCESSING] } },
      },
    });

    return prisma.review.create({
      data: {
        productId,
        userId,
        rating: data.rating,
        title: data.title,
        comment: data.comment,
        images: data.images || [],
        isVerifiedPurchase: !!verifiedPurchase,
        isApproved: false, // requires admin moderation before appearing publicly
      },
    });
  },

  async listPendingForAdmin() {
    return prisma.review.findMany({
      where: { isApproved: false },
      include: { product: { select: { name: true } }, user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
  },

  async moderate(id: string, isApproved: boolean) {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) throw ApiError.notFound('Review not found');
    return prisma.review.update({ where: { id }, data: { isApproved } });
  },

  async remove(id: string) {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) throw ApiError.notFound('Review not found');
    await prisma.review.delete({ where: { id } });
  },
};
