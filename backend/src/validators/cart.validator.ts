import { z } from 'zod';

export const addCartItemSchema = z.object({
  body: z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive().default(1),
  }),
});

export const updateCartItemSchema = z.object({
  body: z.object({
    quantity: z.number().int().min(0),
  }),
  params: z.object({
    productId: z.string().uuid(),
  }),
});

export const applyCouponSchema = z.object({
  body: z.object({
    code: z.string().min(1),
  }),
});
