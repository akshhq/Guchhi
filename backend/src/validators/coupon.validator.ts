import { z } from 'zod';

export const createCouponSchema = z.object({
  body: z.object({
    code: z.string().min(3).toUpperCase(),
    description: z.string().optional(),
    type: z.enum(['PERCENTAGE', 'FLAT']),
    value: z.number().positive(),
    minOrderValue: z.number().min(0).default(0),
    maxDiscountAmount: z.number().positive().optional(),
    usageLimit: z.number().int().positive().optional(),
    usageLimitPerUser: z.number().int().positive().default(1),
    startsAt: z.string().datetime().optional(),
    expiresAt: z.string().datetime().optional(),
    isActive: z.boolean().default(true),
  }),
});

export const updateCouponSchema = z.object({
  body: createCouponSchema.shape.body.partial(),
});
