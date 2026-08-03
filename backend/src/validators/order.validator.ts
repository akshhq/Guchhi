import { z } from 'zod';

export const updateOrderStatusSchema = z.object({
  body: z.object({
    status: z.enum([
      'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED',
      'CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED',
    ]),
    note: z.string().optional(),
  }),
});

export const cancelOrderSchema = z.object({
  body: z.object({
    reason: z.string().min(1, 'Cancellation reason is required'),
  }),
});

export const refundOrderSchema = z.object({
  body: z.object({
    reason: z.string().min(1, 'Refund reason is required').max(500),
  }),
});
