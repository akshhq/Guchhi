/**
 * Integration tests for the checkout flow (backend/src/services/checkout.service.ts
 * and controllers/checkout.controller.ts), exercised through the real HTTP
 * app with supertest against a real Postgres test database.
 *
 * Requires: a running Postgres + Redis (see backend/.env / .env.test) with
 * migrations applied to the `_test` database. See helpers/setupEnv.ts.
 *
 * Run with: npm run test   (after `npx prisma generate` has succeeded —
 * see the project README for why that step currently needs to run outside
 * this sandbox).
 */
import crypto from 'crypto';
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';

// Mock the Razorpay SDK client itself, not our own service code, so
// createRazorpayOrder still runs its real logic (snapshotting to Redis,
// computing totals) without making a network call to Razorpay.
vi.mock('../config/razorpay', () => ({
  default: {
    orders: {
      create: vi.fn().mockResolvedValue({ id: 'order_test_mocked_123' }),
    },
  },
}));

import app from '../app';
import prisma from '../config/db';
import redis from '../config/redis';
import { resetDb, seedProducts, seedCoupon, disconnectDb } from './helpers/testDb';

const API = process.env.API_PREFIX || '/api/v1';

async function signup(email: string) {
  const res = await request(app).post(`${API}/auth/signup`).send({
    firstName: 'Test',
    lastName: 'User',
    email,
    phone: '9876543210',
    password: 'Password@123',
  });
  expect(res.status).toBe(201);
  return {
    token: res.body.data.accessToken as string,
    userId: res.body.data.user.id as string,
  };
}

async function addToCart(token: string, productId: string, quantity: number) {
  const res = await request(app)
    .post(`${API}/cart/items`)
    .set('Authorization', `Bearer ${token}`)
    .send({ productId, quantity });
  expect(res.status).toBe(201);
  return res.body;
}

const SHIPPING_ADDRESS = {
  fullName: 'Test User',
  phone: '9876543210',
  line1: '123 Test Street',
  city: 'Delhi',
  state: 'Delhi',
  postalCode: '110001',
  country: 'India',
};

describe('Checkout flow', () => {
  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
  });

  afterAll(async () => {
    await disconnectDb();
    await redis.quit();
  });

  describe('Cash on Delivery', () => {
    it('creates an order, decrements stock, and empties the cart', async () => {
      const { morels } = await seedProducts();
      const { token, userId } = await signup('cod-happy-path@example.com');
      await addToCart(token, morels.id, 2);

      const res = await request(app)
        .post(`${API}/checkout/cod-order`)
        .set('Authorization', `Bearer ${token}`)
        .send({ shippingAddress: SHIPPING_ADDRESS });

      expect(res.status).toBe(201);
      const order = res.body.data.order;
      expect(order.status).toBe('CONFIRMED');
      expect(Number(order.subtotal)).toBe(morels.price * 2);

      const updatedProduct = await prisma.product.findUnique({ where: { id: morels.id } });
      expect(updatedProduct?.stock).toBe(morels.stock - 2);

      const cart = await prisma.cart.findFirst({ where: { userId } });
      // Cart row may or may not persist depending on implementation, but it
      // must have no items left either way.
      if (cart) {
        const items = await prisma.cartItem.findMany({ where: { cartId: cart.id } });
        expect(items).toHaveLength(0);
      }

      const payment = await prisma.payment.findFirst({ where: { orderId: order.id } });
      expect(payment?.method).toBe('COD');
      expect(payment?.status).toBe('PENDING');
    });

    it('rejects an order that exceeds available stock and leaves stock untouched', async () => {
      const { rice } = await seedProducts(); // seeded with stock: 2
      const { token, userId } = await signup('cod-oversell@example.com');
      await addToCart(token, rice.id, 5);

      const res = await request(app)
        .post(`${API}/checkout/cod-order`)
        .set('Authorization', `Bearer ${token}`)
        .send({ shippingAddress: SHIPPING_ADDRESS });

      expect(res.status).toBe(400);

      const unchanged = await prisma.product.findUnique({ where: { id: rice.id } });
      expect(unchanged?.stock).toBe(rice.stock);

      const orderCount = await prisma.order.count();
      expect(orderCount).toBe(0);
    });

    it('requires a guest email when checking out without an account', async () => {
      const { morels } = await seedProducts();
      const guestId = crypto.randomUUID();

      await request(app)
        .post(`${API}/cart/items`)
        .set('x-guest-id', guestId)
        .send({ productId: morels.id, quantity: 1 })
        .expect(201);

      const res = await request(app)
        .post(`${API}/checkout/cod-order`)
        .set('x-guest-id', guestId)
        .send({ shippingAddress: SHIPPING_ADDRESS }); // no guestEmail

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/email/i);
    });

    it('applies a valid coupon to the order total', async () => {
      const { morels } = await seedProducts(); // price 1500
      await seedCoupon({ code: 'WELCOME10', value: 10, minOrderValue: 500, maxDiscountAmount: 200 });
      const { token, userId } = await signup('cod-coupon@example.com');
      await addToCart(token, morels.id, 1);

      const res = await request(app)
        .post(`${API}/checkout/cod-order`)
        .set('Authorization', `Bearer ${token}`)
        .send({ shippingAddress: SHIPPING_ADDRESS, couponCode: 'WELCOME10' });

      expect(res.status).toBe(201);
      const order = res.body.data.order;
      // 10% of 1500 = 150, under the 200 cap, so discount should be exactly 150.
      expect(Number(order.discount)).toBe(150);
      expect(Number(order.total)).toBeLessThan(morels.price);
    });
  });

  describe('Razorpay payment verification', () => {
    it('rejects a forged signature and does not create an order', async () => {
      const { morels } = await seedProducts();
      const { token, userId } = await signup('razorpay-forged@example.com');
      await addToCart(token, morels.id, 1);

      const createRes = await request(app)
        .post(`${API}/checkout/create-order`)
        .set('Authorization', `Bearer ${token}`)
        .send({ shippingAddress: SHIPPING_ADDRESS });
      expect(createRes.status).toBe(201);
      const { checkoutId, razorpayOrderId } = createRes.body.data;

      const verifyRes = await request(app)
        .post(`${API}/checkout/verify-payment`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          checkoutId,
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: 'pay_fake_123',
          razorpay_signature: 'deadbeef'.repeat(8), // well-formed hex, wrong value
        });

      expect(verifyRes.status).toBe(400);
      expect(await prisma.order.count()).toBe(0);
    });

    it('accepts a correctly signed payment and creates the order exactly once even if verify is called twice', async () => {
      const { morels } = await seedProducts();
      const { token, userId } = await signup('razorpay-happy-path@example.com');
      await addToCart(token, morels.id, 1);

      const createRes = await request(app)
        .post(`${API}/checkout/create-order`)
        .set('Authorization', `Bearer ${token}`)
        .send({ shippingAddress: SHIPPING_ADDRESS });
      const { checkoutId, razorpayOrderId } = createRes.body.data;

      const paymentId = 'pay_test_456';
      const signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(`${razorpayOrderId}|${paymentId}`)
        .digest('hex');

      const first = await request(app)
        .post(`${API}/checkout/verify-payment`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          checkoutId,
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        });
      expect(first.status).toBe(201);
      expect(await prisma.order.count()).toBe(1);

      // Redis snapshot was deleted after the first call, so a second call
      // with the same checkoutId should fail cleanly rather than double-charge.
      const second = await request(app)
        .post(`${API}/checkout/verify-payment`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          checkoutId,
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        });
      expect(second.status).toBe(400);
      expect(await prisma.order.count()).toBe(1);
    });
  });
});
