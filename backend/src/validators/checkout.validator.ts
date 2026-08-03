import { z } from 'zod';

const addressSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(10).max(15),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(3),
  country: z.string().default('India'),
});

export const checkoutSummarySchema = z.object({
  body: z.object({
    shippingAddressId: z.string().uuid().optional(),
    shippingAddress: addressSchema.optional(),
    couponCode: z.string().optional(),
  }),
});

export const createRazorpayOrderSchema = z.object({
  body: z.object({
    shippingAddressId: z.string().uuid().optional(),
    shippingAddress: addressSchema.optional(),
    billingAddressId: z.string().uuid().optional(),
    billingSameAsShipping: z.boolean().default(true),
    couponCode: z.string().optional(),
    guestEmail: z.string().email().optional(),
    guestPhone: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const createCodOrderSchema = createRazorpayOrderSchema;

export const verifyPaymentSchema = z.object({
  body: z.object({
    checkoutId: z.string().uuid(),
    razorpay_order_id: z.string().min(1),
    razorpay_payment_id: z.string().min(1),
    razorpay_signature: z.string().min(1),
  }),
});
