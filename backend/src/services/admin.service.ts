import prisma from '../config/db';
import { OrderStatus } from '@prisma/client';

export const AdminService = {
  async dashboard() {
    const [
      totalOrders,
      totalRevenueAgg,
      totalCustomers,
      totalProducts,
      pendingOrders,
      lowStockCount,
      recentOrders,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { total: true }, where: { status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] } } }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) as count FROM products WHERE stock <= "lowStockThreshold" AND status = 'ACTIVE'`,
      prisma.order.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { items: true } }),
    ]);

    return {
      totalOrders,
      totalRevenue: totalRevenueAgg._sum.total || 0,
      totalCustomers,
      totalProducts,
      pendingOrders,
      lowStockCount: Number(lowStockCount[0]?.count || 0),
      recentOrders,
    };
  },

  async salesAnalytics(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: since }, status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] } },
      select: { createdAt: true, total: true },
    });

    const byDay = new Map<string, number>();
    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) || 0) + Number(o.total));
    }

    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue }));
  },

  async topProducts(limit = 5) {
    const grouped = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    const productIds = grouped.map((g) => g.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    return grouped.map((g) => ({
      product: productMap.get(g.productId),
      unitsSold: g._sum.quantity || 0,
      revenue: g._sum.lineTotal || 0,
    }));
  },

  async listCustomers(query: { page?: string; limit?: string; search?: string }) {
    const { getPagination, buildMeta } = await import('../utils/pagination');
    const { page, limit, skip } = getPagination(query);
    const where: any = { role: 'CUSTOMER' };
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, isActive: true, isEmailVerified: true, createdAt: true, _count: { select: { orders: true } } },
      }),
      prisma.user.count({ where }),
    ]);
    return { items, meta: buildMeta(page, limit, total) };
  },

  async setCustomerActive(userId: string, isActive: boolean) {
    return prisma.user.update({ where: { id: userId }, data: { isActive } });
  },
};
