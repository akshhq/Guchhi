import { z } from 'zod';

export const wishlistItemSchema = z.object({
  body: z.object({
    productId: z.string().uuid(),
  }),
});
