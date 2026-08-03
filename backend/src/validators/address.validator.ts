import { z } from 'zod';

export const createAddressSchema = z.object({
  body: z.object({
    type: z.enum(['SHIPPING', 'BILLING']).default('SHIPPING'),
    fullName: z.string().min(1),
    phone: z.string().min(10).max(15),
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    postalCode: z.string().min(3),
    country: z.string().default('India'),
    isDefault: z.boolean().optional(),
  }),
});

export const updateAddressSchema = z.object({
  body: createAddressSchema.shape.body.partial(),
});
