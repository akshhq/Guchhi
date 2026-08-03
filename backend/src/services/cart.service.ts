import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';
import { CouponService } from './coupon.service';
import { ProductStatus } from '@prisma/client';

interface CartActor {
  userId?: string;
  guestId?: string;
}

async function findOrCreateCart(actor: CartActor) {
  if (!actor.userId && !actor.guestId) {
    throw ApiError.badRequest('A user session or guest identifier is required for cart operations');
  }

  const where = actor.userId ? { userId: actor.userId } : { guestId: actor.guestId };
  let cart = await prisma.cart.findFirst({ where });
  if (!cart) {
    cart = await prisma.cart.create({ data: actor.userId ? { userId: actor.userId } : { guestId: actor.guestId } });
  }
  return cart;
}

async function detailedCart(cartId: string) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      coupon: true,
      items: {
        include: { product: { include: { images: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!cart) throw ApiError.notFound('Cart not found');

  const items = cart.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    quantity: item.quantity,
    product: item.product,
    lineTotal: Number(item.product.salePrice ?? item.product.price) * item.quantity,
  }));

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);

  let discount = 0;
  if (cart.coupon) {
    try {
      const result = await CouponService.validateCoupon(cart.coupon.code, subtotal);
      discount = result.discount;
    } catch {
      discount = 0; // coupon became invalid (expired/limit) — silently drop discount, keep coupon reference for user visibility
    }
  }

  const shipping = subtotal === 0 ? 0 : subtotal - discount >= env.FREE_SHIPPING_THRESHOLD ? 0 : env.FLAT_SHIPPING_RATE;
  const tax = Math.round(((subtotal - discount) * env.TAX_RATE_PERCENT) / 100);
  const total = Math.max(subtotal - discount + shipping + tax, 0);

  return {
    id: cart.id,
    items,
    coupon: cart.coupon,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotal,
    discount,
    shipping,
    tax,
    total,
  };
}

export const CartService = {
  async getCart(actor: CartActor) {
    const cart = await findOrCreateCart(actor);
    return detailedCart(cart.id);
  },

  async addItem(actor: CartActor, productId: string, quantity: number) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== ProductStatus.ACTIVE) throw ApiError.notFound('Product not found');

    const cart = await findOrCreateCart(actor);
    const existing = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });

    const desiredQty = (existing?.quantity ?? 0) + quantity;
    if (desiredQty > product.stock) {
      throw ApiError.badRequest(`Only ${product.stock} unit(s) of "${product.name}" available`);
    }

    if (existing) {
      await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: desiredQty } });
    } else {
      await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity } });
    }

    return detailedCart(cart.id);
  },

  async updateItem(actor: CartActor, productId: string, quantity: number) {
    const cart = await findOrCreateCart(actor);
    if (quantity <= 0) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
      return detailedCart(cart.id);
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound('Product not found');
    if (quantity > product.stock) throw ApiError.badRequest(`Only ${product.stock} unit(s) available`);

    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      update: { quantity },
      create: { cartId: cart.id, productId, quantity },
    });

    return detailedCart(cart.id);
  },

  async removeItem(actor: CartActor, productId: string) {
    const cart = await findOrCreateCart(actor);
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
    return detailedCart(cart.id);
  },

  async clearCart(actor: CartActor) {
    const cart = await findOrCreateCart(actor);
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await prisma.cart.update({ where: { id: cart.id }, data: { couponId: null } });
    return detailedCart(cart.id);
  },

  async applyCoupon(actor: CartActor, code: string) {
    const cart = await findOrCreateCart(actor);
    const current = await detailedCart(cart.id);
    if (current.items.length === 0) throw ApiError.badRequest('Your cart is empty');

    const { coupon } = await CouponService.validateCoupon(code, current.subtotal, actor.userId);
    await prisma.cart.update({ where: { id: cart.id }, data: { couponId: coupon.id } });
    return detailedCart(cart.id);
  },

  async removeCoupon(actor: CartActor) {
    const cart = await findOrCreateCart(actor);
    await prisma.cart.update({ where: { id: cart.id }, data: { couponId: null } });
    return detailedCart(cart.id);
  },

  /** Merges a guest cart into a user's cart after login/signup. Quantities are summed; stock caps applied. */
  async mergeGuestCart(guestId: string, userId: string) {
    const guestCart = await prisma.cart.findFirst({ where: { guestId }, include: { items: true } });
    if (!guestCart || guestCart.items.length === 0) return;

    const userCart = await findOrCreateCart({ userId });

    for (const item of guestCart.items) {
      const existing = await prisma.cartItem.findUnique({
        where: { cartId_productId: { cartId: userCart.id, productId: item.productId } },
      });
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;

      const mergedQty = Math.min((existing?.quantity ?? 0) + item.quantity, product.stock);
      await prisma.cartItem.upsert({
        where: { cartId_productId: { cartId: userCart.id, productId: item.productId } },
        update: { quantity: mergedQty },
        create: { cartId: userCart.id, productId: item.productId, quantity: mergedQty },
      });
    }

    await prisma.cart.delete({ where: { id: guestCart.id } });
  },

  detailedCart,
  findOrCreateCart,
};
