import crypto from 'crypto';
import prisma from '../config/db';
import redis from '../config/redis';
import razorpay from '../config/razorpay';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { CartService } from './cart.service';
import { CouponService } from './coupon.service';
import { generateOrderNumber } from '../utils/order';
import { sendMail } from '../emails/mailer';
import {
  orderConfirmationEmail,
  paymentConfirmationEmail,
} from '../emails/templates';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';

/**
 * Verifies an HMAC-SHA256 signature using a constant-time comparison.
 * A naive `===`/`!==` string compare leaks timing information about how
 * many leading bytes matched, which is exactly the kind of side channel
 * signature verification exists to prevent.
 */
export function verifyRazorpaySignature(
  payload: string,
  signature: string,
): boolean {
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(signature || '', 'hex');
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

interface CartActor {
  userId?: string;
  guestId?: string;
}

interface AddressInput {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

interface CheckoutInput {
  shippingAddressId?: string;
  shippingAddress?: AddressInput;
  billingAddressId?: string;
  billingSameAsShipping?: boolean;
  couponCode?: string;
  guestEmail?: string;
  guestPhone?: string;
  notes?: string;
}

const CHECKOUT_TTL_SECONDS = 30 * 60;

/** Resolves a persisted address (own by the user) or an ad-hoc address snapshot (guest). */
async function resolveShippingAddress(actor: CartActor, input: CheckoutInput) {
  if (input.shippingAddressId) {
    const address = await prisma.address.findFirst({
      where: {
        id: input.shippingAddressId,
        ...(actor.userId ? { userId: actor.userId } : {}),
      },
    });
    if (!address) throw ApiError.notFound('Shipping address not found');
    return address;
  }
  if (input.shippingAddress) {
    return prisma.address.create({
      data: {
        ...input.shippingAddress,
        country: input.shippingAddress.country || 'India',
        userId: actor.userId,
        type: 'SHIPPING',
      },
    });
  }
  throw ApiError.badRequest('A shipping address is required to check out');
}

async function computeTotals(actor: CartActor, couponCode?: string) {
  const cart = await CartService.getCart(actor);
  if (cart.items.length === 0) throw ApiError.badRequest('Your cart is empty');

  for (const item of cart.items) {
    if (item.product.stock < item.quantity) {
      throw ApiError.badRequest(
        `"${item.product.name}" only has ${item.product.stock} unit(s) left in stock`,
      );
    }
  }

  let discount = 0;
  let couponId: string | undefined;
  if (couponCode) {
    const result = await CouponService.validateCoupon(
      couponCode,
      cart.subtotal,
      actor.userId,
    );
    discount = result.discount;
    couponId = result.coupon.id;
  } else if (cart.coupon) {
    discount = cart.discount;
    couponId = cart.coupon.id;
  }

  const taxableAmount = cart.subtotal - discount;
  const shipping =
    taxableAmount >= env.FREE_SHIPPING_THRESHOLD ? 0 : env.FLAT_SHIPPING_RATE;
  const tax = Math.round((taxableAmount * env.TAX_RATE_PERCENT) / 100);
  const total = Math.max(taxableAmount + shipping + tax, 0);

  return {
    cart,
    subtotal: cart.subtotal,
    discount,
    couponId,
    shipping,
    tax,
    total,
  };
}

/**
 * Creates the order + deducts inventory inside a single transaction. Shared
 * by both the client-driven verify-payment call and the server-to-server
 * Razorpay webhook, since both ultimately need to do the same thing once a
 * payment has been authenticated by whichever path received it.
 */
async function createOrderFromPaidSnapshot(
  snapshot: any,
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string | null,
) {
  try {
    return await prisma.$transaction(async (tx) => {
      const productIds = snapshot.items.map((i: any) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      const orderItemsData = [];
      for (const item of snapshot.items) {
        const product = productMap.get(item.productId);
        if (!product)
          throw ApiError.notFound(
            `Product ${item.productId} no longer exists`,
          );
        if (product.stock < item.quantity) {
          throw ApiError.badRequest(`"${product.name}" is out of stock`);
        }
        orderItemsData.push({
          productId: product.id,
          name: product.name,
          sku: product.sku,
          price: product.salePrice ?? product.price,
          quantity: item.quantity,
          lineTotal:
            Number(product.salePrice ?? product.price) * item.quantity,
        });
      }

      const createdOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId: snapshot.actor.userId,
          guestEmail: snapshot.guestEmail,
          guestPhone: snapshot.guestPhone,
          status: OrderStatus.CONFIRMED,
          subtotal: snapshot.subtotal,
          discount: snapshot.discount,
          tax: snapshot.tax,
          shippingFee: snapshot.shipping,
          total: snapshot.total,
          couponId: snapshot.couponId,
          shippingAddressId: snapshot.shippingAddressId,
          billingAddressId: snapshot.billingAddressId,
          notes: snapshot.notes,
          items: { create: orderItemsData },
          statusHistory: {
            create: {
              status: OrderStatus.CONFIRMED,
              note: 'Payment verified',
            },
          },
        },
        include: { items: true },
      });

      // Deduct stock per item; guard against race conditions with a conditional update.
      for (const item of snapshot.items) {
        const result = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (result.count === 0) {
          throw ApiError.badRequest(
            'One or more items went out of stock during checkout. Please try again.',
          );
        }
        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            action: 'STOCK_OUT',
            quantity: item.quantity,
            orderId: createdOrder.id,
            reason: 'Order placed',
          },
        });
      }

      await tx.payment.create({
        data: {
          orderId: createdOrder.id,
          method: PaymentMethod.RAZORPAY,
          status: PaymentStatus.PAID,
          amount: snapshot.total,
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature ?? 'verified-via-webhook',
          paidAt: new Date(),
        },
      });

      if (snapshot.couponId) {
        await tx.coupon.update({
          where: { id: snapshot.couponId },
          data: { usedCount: { increment: 1 } },
        });
        if (snapshot.actor.userId) {
          await tx.couponRedemption.create({
            data: {
              couponId: snapshot.couponId,
              userId: snapshot.actor.userId,
              orderId: createdOrder.id,
            },
          });
        }
      }

      // Clear the cart that funded this order
      const cartWhere = snapshot.actor.userId
        ? { userId: snapshot.actor.userId }
        : { guestId: snapshot.actor.guestId };
      const cart = await tx.cart.findFirst({ where: cartWhere });
      if (cart) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        await tx.cart.update({
          where: { id: cart.id },
          data: { couponId: null },
        });
      }

      return createdOrder;
    });
  } catch (err) {
    // If a duplicate request somehow got this far (e.g. the client
    // verify-payment call and the webhook both raced to create the same
    // order), the unique constraint on Payment.razorpayOrderId rejects the
    // second insert — treat that as "already processed" rather than erroring.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      const existingPayment = await prisma.payment.findUnique({
        where: { razorpayOrderId: razorpay_order_id },
      });
      if (existingPayment) {
        const existingOrder = await prisma.order.findUnique({
          where: { id: existingPayment.orderId },
        });
        if (existingOrder) return existingOrder;
      }
    }
    throw err;
  }
}

export const CheckoutService = {
  /** Preview totals before payment — used to render the order summary screen. */
  async summary(actor: CartActor, input: CheckoutInput) {
    const totals = await computeTotals(actor, input.couponCode);
    return {
      items: totals.cart.items,
      subtotal: totals.subtotal,
      discount: totals.discount,
      shipping: totals.shipping,
      tax: totals.tax,
      total: totals.total,
    };
  },

  /** Step 1 of the Razorpay flow: create a Razorpay order and stash a checkout snapshot in Redis. */
  async createRazorpayOrder(actor: CartActor, input: CheckoutInput) {
    if (!actor.userId && !input.guestEmail) {
      throw ApiError.badRequest('Guest checkout requires an email address');
    }

    const totals = await computeTotals(actor, input.couponCode);
    const shippingAddress = await resolveShippingAddress(actor, input);
    const billingAddress =
      input.billingSameAsShipping === false && input.billingAddressId
        ? await prisma.address.findFirst({
            where: { id: input.billingAddressId },
          })
        : shippingAddress;

    const amountInPaise = Math.round(totals.total * 100);
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `chk_${Date.now()}`,
      notes: { userId: actor.userId || '', guestId: actor.guestId || '' },
    });

    const checkoutId = crypto.randomUUID();
    const snapshot = {
      actor,
      items: totals.cart.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      })),
      subtotal: totals.subtotal,
      discount: totals.discount,
      couponId: totals.couponId,
      shipping: totals.shipping,
      tax: totals.tax,
      total: totals.total,
      shippingAddressId: shippingAddress.id,
      billingAddressId: billingAddress?.id || shippingAddress.id,
      guestEmail: input.guestEmail,
      guestPhone: input.guestPhone,
      notes: input.notes,
      razorpayOrderId: razorpayOrder.id,
    };

    await redis.set(
      `checkout:${checkoutId}`,
      JSON.stringify(snapshot),
      'EX',
      CHECKOUT_TTL_SECONDS,
    );
    // Reverse lookup so the Razorpay webhook (server-to-server, keyed by
    // razorpay_order_id only) can find the same snapshot independently of
    // the client-side verify-payment call.
    await redis.set(
      `checkout:by-razorpay-order:${razorpayOrder.id}`,
      checkoutId,
      'EX',
      CHECKOUT_TTL_SECONDS,
    );

    return {
      checkoutId,
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId: env.RAZORPAY_KEY_ID,
      total: totals.total,
    };
  },

  /** Step 2: verify the Razorpay signature, then atomically create the order and deduct inventory. NEVER trust the frontend's "payment succeeded" claim without this check. */
  async verifyAndCreateOrder(
    checkoutId: string,
    razorpay_order_id: string,
    razorpay_payment_id: string,
    razorpay_signature: string,
  ) {
    const raw = await redis.get(`checkout:${checkoutId}`);
    if (!raw)
      throw ApiError.badRequest(
        'Checkout session expired or not found. Please try again.',
      );
    const snapshot = JSON.parse(raw);

    // Claim the snapshot immediately so a duplicate/concurrent request for the
    // same checkoutId (e.g. a double form submit) can't both pass this check
    // and race each other into creating two orders from one payment.
    await redis.del(`checkout:${checkoutId}`);

    if (snapshot.razorpayOrderId !== razorpay_order_id) {
      throw ApiError.badRequest('Order/payment mismatch');
    }

    if (
      !verifyRazorpaySignature(
        `${razorpay_order_id}|${razorpay_payment_id}`,
        razorpay_signature,
      )
    ) {
      throw ApiError.badRequest(
        'Payment verification failed. Signature mismatch.',
      );
    }

    const order = await createOrderFromPaidSnapshot(
      snapshot,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    );

    const email =
      snapshot.guestEmail || (await getUserEmail(snapshot.actor.userId));
    const name = snapshot.guestEmail
      ? 'there'
      : await getUserFirstName(snapshot.actor.userId);
    if (email) {
      sendMail(
        email,
        `Order Confirmed — ${order.orderNumber}`,
        orderConfirmationEmail(name, order.orderNumber, order.total.toString()),
      );
      sendMail(
        email,
        `Payment Received — ${order.orderNumber}`,
        paymentConfirmationEmail(
          name,
          order.orderNumber,
          order.total.toString(),
        ),
      );
    }

    return order;
  },

  /**
   * Server-to-server reconciliation path. The client-driven verify-payment
   * call above is the primary path, but it can be missed entirely (e.g. the
   * user closes the tab right after paying, before the redirect completes).
   * This webhook is the source of truth Razorpay itself guarantees delivery
   * for, so it's what actually keeps orders from silently going unpaid.
   *
   * The raw request body + `x-razorpay-signature` header must already have
   * been verified by the caller (see webhook.controller.ts) before this is
   * invoked — this function trusts that the event is authentic.
   */
  async handleRazorpayWebhookEvent(event: any) {
    const eventType = event?.event;
    if (eventType !== 'payment.captured' && eventType !== 'order.paid') {
      return { handled: false, reason: `Ignored event type: ${eventType}` };
    }

    const paymentEntity = event?.payload?.payment?.entity;
    const razorpayOrderId: string | undefined = paymentEntity?.order_id;
    const razorpayPaymentId: string | undefined = paymentEntity?.id;
    if (!razorpayOrderId || !razorpayPaymentId) {
      return { handled: false, reason: 'Missing order/payment id in payload' };
    }

    // Idempotent: if the client-driven path already created this order, do nothing.
    const existingPayment = await prisma.payment.findUnique({
      where: { razorpayOrderId },
    });
    if (existingPayment) {
      return { handled: true, reason: 'Already processed', orderId: existingPayment.orderId };
    }

    const checkoutId = await redis.get(`checkout:by-razorpay-order:${razorpayOrderId}`);
    if (!checkoutId) {
      // Snapshot already claimed/expired, or this order predates the reverse-lookup key.
      // Nothing we can safely reconstruct from here — log for manual reconciliation.
      return { handled: false, reason: 'No matching checkout snapshot found' };
    }

    const raw = await redis.get(`checkout:${checkoutId}`);
    if (!raw) {
      return { handled: true, reason: 'Snapshot already claimed by client-driven verify-payment' };
    }
    const snapshot = JSON.parse(raw);
    await redis.del(`checkout:${checkoutId}`);
    await redis.del(`checkout:by-razorpay-order:${razorpayOrderId}`);

    const order = await createOrderFromPaidSnapshot(snapshot, razorpayOrderId, razorpayPaymentId, null);

    const email = snapshot.guestEmail || (await getUserEmail(snapshot.actor.userId));
    const name = snapshot.guestEmail ? 'there' : await getUserFirstName(snapshot.actor.userId);
    if (email) {
      sendMail(email, `Order Confirmed — ${order.orderNumber}`, orderConfirmationEmail(name, order.orderNumber, order.total.toString()));
      sendMail(email, `Payment Received — ${order.orderNumber}`, paymentConfirmationEmail(name, order.orderNumber, order.total.toString()));
    }

    return { handled: true, reason: 'Order created from webhook', orderId: order.id };
  },
  async createCodOrder(actor: CartActor, input: CheckoutInput) {
    if (!actor.userId && !input.guestEmail) {
      throw ApiError.badRequest('Guest checkout requires an email address');
    }
    const totals = await computeTotals(actor, input.couponCode);
    const shippingAddress = await resolveShippingAddress(actor, input);

    const order = await prisma.$transaction(async (tx) => {
      const orderItemsData = [];
      for (const item of totals.cart.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (!product || product.stock < item.quantity) {
          throw ApiError.badRequest(`"${item.product.name}" is out of stock`);
        }
        orderItemsData.push({
          productId: product.id,
          name: product.name,
          sku: product.sku,
          price: product.salePrice ?? product.price,
          quantity: item.quantity,
          lineTotal: Number(product.salePrice ?? product.price) * item.quantity,
        });
      }

      const createdOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId: actor.userId,
          guestEmail: input.guestEmail,
          guestPhone: input.guestPhone,
          status: OrderStatus.CONFIRMED,
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          shippingFee: totals.shipping,
          total: totals.total,
          couponId: totals.couponId,
          shippingAddressId: shippingAddress.id,
          billingAddressId: shippingAddress.id,
          notes: input.notes,
          items: { create: orderItemsData },
          statusHistory: {
            create: { status: OrderStatus.CONFIRMED, note: 'COD order placed' },
          },
        },
      });

      for (const item of totals.cart.items) {
        const result = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (result.count === 0)
          throw ApiError.badRequest(
            'One or more items went out of stock. Please try again.',
          );
        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            action: 'STOCK_OUT',
            quantity: item.quantity,
            orderId: createdOrder.id,
            reason: 'COD order placed',
          },
        });
      }

      await tx.payment.create({
        data: {
          orderId: createdOrder.id,
          method: PaymentMethod.COD,
          status: PaymentStatus.PENDING,
          amount: totals.total,
        },
      });

      const cartWhere = actor.userId
        ? { userId: actor.userId }
        : { guestId: actor.guestId };
      const cart = await tx.cart.findFirst({ where: cartWhere });
      if (cart) await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return createdOrder;
    });

    const email = input.guestEmail || (await getUserEmail(actor.userId));
    const name = input.guestEmail
      ? 'there'
      : await getUserFirstName(actor.userId);
    if (email)
      sendMail(
        email,
        `Order Confirmed — ${order.orderNumber}`,
        orderConfirmationEmail(name, order.orderNumber, order.total.toString()),
      );

    return order;
  },
};

async function getUserEmail(userId?: string) {
  if (!userId) return undefined;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.email;
}
async function getUserFirstName(userId?: string) {
  if (!userId) return 'there';
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.firstName || 'there';
}
