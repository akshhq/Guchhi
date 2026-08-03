import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';
import { CouponType } from '@prisma/client';

export const CouponService = {
  async validateCoupon(code: string, subtotal: number, userId?: string) {
    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon || !coupon.isActive) throw ApiError.badRequest('Invalid coupon code');

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) throw ApiError.badRequest('This coupon is not active yet');
    if (coupon.expiresAt && coupon.expiresAt < now) throw ApiError.badRequest('This coupon has expired');
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw ApiError.badRequest('This coupon has reached its usage limit');
    }
    if (Number(coupon.minOrderValue) > subtotal) {
      throw ApiError.badRequest(`Minimum order value of ₹${coupon.minOrderValue} required for this coupon`);
    }

    if (userId && coupon.usageLimitPerUser) {
      const userUsage = await prisma.couponRedemption.count({ where: { couponId: coupon.id, userId } });
      if (userUsage >= coupon.usageLimitPerUser) {
        throw ApiError.badRequest('You have already used this coupon the maximum number of times');
      }
    }

    let discount = 0;
    if (coupon.type === CouponType.PERCENTAGE) {
      discount = (subtotal * Number(coupon.value)) / 100;
      if (coupon.maxDiscountAmount) discount = Math.min(discount, Number(coupon.maxDiscountAmount));
    } else {
      discount = Number(coupon.value);
    }
    discount = Math.min(discount, subtotal);

    return { coupon, discount };
  },

  async list() {
    return prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  },

  async create(data: any) {
    const existing = await prisma.coupon.findUnique({ where: { code: data.code.toUpperCase() } });
    if (existing) throw ApiError.conflict('A coupon with this code already exists');
    return prisma.coupon.create({ data: { ...data, code: data.code.toUpperCase() } });
  },

  async update(id: string, data: any) {
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw ApiError.notFound('Coupon not found');
    return prisma.coupon.update({ where: { id }, data });
  },

  async remove(id: string) {
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw ApiError.notFound('Coupon not found');
    await prisma.coupon.delete({ where: { id } });
  },
};
