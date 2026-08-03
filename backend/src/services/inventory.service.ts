import prisma from '../config/db';
import { getPagination, buildMeta } from '../utils/pagination';

export const InventoryService = {
  async lowStockProducts() {
    const products = await prisma.product.findMany({
      where: { status: 'ACTIVE' },
    });
    return products.filter((p) => p.stock <= p.lowStockThreshold);
  },

  async logs(query: { page?: string; limit?: string; productId?: string }) {
    const { page, limit, skip } = getPagination(query);
    const where = query.productId ? { productId: query.productId } : {};
    const [items, total] = await Promise.all([
      prisma.inventoryLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { product: { select: { name: true, sku: true } } },
      }),
      prisma.inventoryLog.count({ where }),
    ]);
    return { items, meta: buildMeta(page, limit, total) };
  },

  async adjustStock(productId: string, quantity: number, reason?: string) {
    const product = await prisma.product.update({
      where: { id: productId },
      data: { stock: { increment: quantity } },
    });
    await prisma.inventoryLog.create({
      data: {
        productId,
        action: quantity >= 0 ? 'STOCK_IN' : 'ADJUSTMENT',
        quantity: Math.abs(quantity),
        reason: reason || 'Manual adjustment',
      },
    });
    return product;
  },
};
