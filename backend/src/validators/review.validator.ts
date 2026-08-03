import { z } from 'zod';

export const createReviewSchema = z.object({
  body: z.object({
    productId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    title: z.string().max(150).optional(),
    comment: z.string().max(2000).optional(),
    images: z.array(z.string()).max(5).optional(),
  }),
});

export const moderateReviewSchema = z.object({
  body: z.object({
    isApproved: z.boolean(),
  }),
});
