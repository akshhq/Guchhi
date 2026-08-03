import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';

export const WishlistService = {
  async list(userId: string) {
    return prisma.wishlist.findMany({
      where: { userId },
      include: { product: { include: { images: true, category: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async add(userId: string, productId: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound('Product not found');

    return prisma.wishlist.upsert({
      where: { userId_productId: { userId, productId } },
      update: {},
      create: { userId, productId },
    });
  },

  async remove(userId: string, productId: string) {
    await prisma.wishlist.deleteMany({ where: { userId, productId } });
  },

  /** Moves a wishlist item into the user's cart, then removes it from the wishlist. */
  async moveToCart(userId: string, productId: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound('Product not found');
    if (product.stock < 1) throw ApiError.badRequest('This product is currently out of stock');

    const cart = await prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    const existing = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });
    if (existing) {
      await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: { increment: 1 } } });
    } else {
      await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity: 1 } });
    }

    await prisma.wishlist.deleteMany({ where: { userId, productId } });
  },
};
