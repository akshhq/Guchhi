/**
 * Integration tests for:
 *  - guest-cart merge into a user's cart on login (cart.service.ts mergeGuestCart,
 *    invoked from controllers/auth.controller.ts login())
 *  - coupon validation edge cases (services/coupon.service.ts), exercised
 *    through POST /checkout/summary since that's the endpoint that surfaces
 *    them to a shopper before payment.
 *
 * Same requirements as checkout.test.ts: real Postgres test DB + Redis.
 * Unexecuted in this environment for the same reason (Prisma engine binary
 * download blocked by sandbox network policy) — written to run wherever
 * `npx prisma generate` succeeds.
 */
import crypto from 'crypto';
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';

vi.mock('../config/razorpay', () => ({
  default: { orders: { create: vi.fn() } },
}));

import app from '../app';
import prisma from '../config/db';
import redis from '../config/redis';
import { resetDb, seedProducts, seedCoupon, disconnectDb } from './helpers/testDb';

const API = process.env.API_PREFIX || '/api/v1';

async function signup(email: string, guestId?: string) {
  const req = request(app).post(`${API}/auth/signup`).send({
    firstName: 'Test',
    lastName: 'User',
    email,
    phone: '9876543210',
    password: 'Password@123',
  });
  if (guestId) req.set('x-guest-id', guestId);
  const res = await req;
  expect(res.status).toBe(201);
  return { token: res.body.data.accessToken as string, userId: res.body.data.user.id as string };
}

async function login(email: string, guestId?: string) {
  const req = request(app).post(`${API}/auth/login`).send({ email, password: 'Password@123' });
  if (guestId) req.set('x-guest-id', guestId);
  const res = await req;
  expect(res.status).toBe(200);
  return { token: res.body.data.accessToken as string, userId: res.body.data.user.id as string };
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

describe('Guest cart merge on login', () => {
  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
  });

  afterAll(async () => {
    await disconnectDb();
    await redis.quit();
  });

  it('merges guest cart quantities into the user cart and deletes the guest cart', async () => {
    const { morels } = await seedProducts(); // stock: 5

    // Existing account, already has 1 unit in their own cart.
    const { token, userId } = await signup('merge-user@example.com');
    await request(app)
      .post(`${API}/cart/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: morels.id, quantity: 1 })
      .expect(201);

    // Same shopper, on a different device/session, added 2 units as a guest
    // before ever logging in.
    const guestId = crypto.randomUUID();
    await request(app)
      .post(`${API}/cart/items`)
      .set('x-guest-id', guestId)
      .send({ productId: morels.id, quantity: 2 })
      .expect(201);

    // Logging in with that guest id present should merge 1 + 2 = 3.
    await login('merge-user@example.com', guestId);

    const cartRes = await request(app)
      .get(`${API}/cart`)
      .set('Authorization', `Bearer ${token}`);
    expect(cartRes.status).toBe(200);
    const items = cartRes.body.data.cart.items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);

    const guestCart = await prisma.cart.findFirst({ where: { guestId } });
    expect(guestCart).toBeNull();
  });

  it('caps the merged quantity at available stock rather than overselling', async () => {
    const { rice } = await seedProducts(); // stock: 2

    const { token } = await signup('merge-overstock@example.com');
    await request(app)
      .post(`${API}/cart/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: rice.id, quantity: 2 }) // maxes out stock already
      .expect(201);

    // A guest cart also has this product — quantity 5, which individually
    // would be rejected, but addItem's own guard only checks quantity
    // against *current* stock at the time it's added to the guest cart, so
    // seed it directly to simulate a guest cart that predates a stock drop.
    const guestId = crypto.randomUUID();
    const guestCart = await prisma.cart.create({ data: { guestId } });
    await prisma.cartItem.create({
      data: { cartId: guestCart.id, productId: rice.id, quantity: 5 },
    });

    await login('merge-overstock@example.com', guestId);

    const cartRes = await request(app)
      .get(`${API}/cart`)
      .set('Authorization', `Bearer ${token}`);
    const items = cartRes.body.data.cart.items;
    expect(items).toHaveLength(1);
    // 2 (existing) + 5 (guest) = 7, capped at stock of 2.
    expect(items[0].quantity).toBe(rice.stock);
  });

  it('leaves the user cart untouched when there is no guest cart to merge', async () => {
    const { morels } = await seedProducts();
    const { token } = await signup('merge-none@example.com');
    await request(app)
      .post(`${API}/cart/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: morels.id, quantity: 1 })
      .expect(201);

    // Login with a guest id that was never used to add anything.
    await login('merge-none@example.com', crypto.randomUUID());

    const cartRes = await request(app)
      .get(`${API}/cart`)
      .set('Authorization', `Bearer ${token}`);
    expect(cartRes.body.data.cart.items).toHaveLength(1);
    expect(cartRes.body.data.cart.items[0].quantity).toBe(1);
  });
});

describe('Coupon validation edge cases', () => {
  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
  });

  afterAll(async () => {
    await disconnectDb();
    await redis.quit();
  });

  async function getSummary(token: string, couponCode: string) {
    return request(app)
      .post(`${API}/checkout/summary`)
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingAddress: SHIPPING_ADDRESS, couponCode });
  }

  it('rejects an unknown coupon code', async () => {
    const { morels } = await seedProducts();
    const { token } = await signup('coupon-unknown@example.com');
    await request(app)
      .post(`${API}/cart/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: morels.id, quantity: 1 })
      .expect(201);

    const res = await getSummary(token, 'DOES-NOT-EXIST');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid coupon/i);
  });

  it('rejects a coupon when the order is below its minimum value', async () => {
    const { rice } = await seedProducts(); // price 650
    await seedCoupon({ code: 'BIGORDER', value: 10, minOrderValue: 5000 });
    const { token } = await signup('coupon-minorder@example.com');
    await request(app)
      .post(`${API}/cart/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: rice.id, quantity: 1 }) // subtotal 650, well under 5000
      .expect(201);

    const res = await getSummary(token, 'BIGORDER');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/minimum order value/i);
  });

  it('rejects an expired coupon', async () => {
    const { morels } = await seedProducts();
    await prisma.coupon.create({
      data: {
        code: 'EXPIRED5',
        description: 'Old promo',
        type: 'PERCENTAGE',
        value: 5,
        minOrderValue: 0,
        usageLimitPerUser: 1,
        isActive: true,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
      },
    });
    const { token } = await signup('coupon-expired@example.com');
    await request(app)
      .post(`${API}/cart/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: morels.id, quantity: 1 })
      .expect(201);

    const res = await getSummary(token, 'EXPIRED5');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/expired/i);
  });

  it('rejects a coupon that has already reached this user\'s per-user usage limit', async () => {
    const { morels } = await seedProducts(); // price 1500, well above minOrderValue
    await seedCoupon({ code: 'ONETIME', value: 10, minOrderValue: 0, maxDiscountAmount: 200 });
    const { token, userId } = await signup('coupon-reused@example.com');

    // Place a real COD order using the coupon once — this is what actually
    // creates the CouponRedemption row the per-user limit checks against.
    await request(app)
      .post(`${API}/cart/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: morels.id, quantity: 1 })
      .expect(201);
    const firstOrder = await request(app)
      .post(`${API}/checkout/cod-order`)
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingAddress: SHIPPING_ADDRESS, couponCode: 'ONETIME' });
    expect(firstOrder.status).toBe(201);

    const redemptions = await prisma.couponRedemption.count({ where: { userId } });
    expect(redemptions).toBe(1);

    // Try to use it again on a new cart.
    await request(app)
      .post(`${API}/cart/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: morels.id, quantity: 1 })
      .expect(201);
    const res = await getSummary(token, 'ONETIME');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already used/i);
  });

  it('caps a percentage discount at maxDiscountAmount', async () => {
    const { morels } = await seedProducts(); // price 1500
    await seedCoupon({ code: 'CAPPED', value: 50, minOrderValue: 0, maxDiscountAmount: 200 });
    const { token } = await signup('coupon-capped@example.com');
    await request(app)
      .post(`${API}/cart/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: morels.id, quantity: 1 }) // 50% of 1500 = 750, way over the 200 cap
      .expect(201);

    const res = await getSummary(token, 'CAPPED');
    expect(res.status).toBe(200);
    expect(Number(res.body.data.summary.discount)).toBe(200);
  });
});
