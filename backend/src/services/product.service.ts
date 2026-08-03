import { Prisma, ProductStatus } from '@prisma/client';
import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';
import { getPagination, buildMeta } from '../utils/pagination';

interface ListQuery {
  page?: string;
  limit?: string;
  search?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  featured?: string;
}

function sortToOrderBy(sort?: string): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case 'price_asc':
      return { price: 'asc' };
    case 'price_desc':
      return { price: 'desc' };
    case 'name_asc':
      return { name: 'asc' };
    case 'popular':
      return { reviews: { _count: 'desc' } };
    case 'newest':
    default:
      return { createdAt: 'desc' };
  }
}

export const ProductService = {
  async list(query: ListQuery) {
    const { page, limit, skip } = getPagination(query);

    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.ACTIVE,
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.category) {
      where.category = { slug: query.category };
    }

    if (query.minPrice || query.maxPrice) {
      where.price = {
        ...(query.minPrice ? { gte: new Prisma.Decimal(query.minPrice) } : {}),
        ...(query.maxPrice ? { lte: new Prisma.Decimal(query.maxPrice) } : {}),
      };
    }

    if (query.featured === 'true') {
      where.isFeatured = true;
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: sortToOrderBy(query.sort),
        include: { category: true, images: true, _count: { select: { reviews: true } } },
      }),
      prisma.product.count({ where }),
    ]);

    return { items, meta: buildMeta(page, limit, total) };
  },

  async getBySlug(slug: string) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        images: { orderBy: { position: 'asc' } },
        reviews: { where: { isApproved: true }, include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!product || product.status !== ProductStatus.ACTIVE) throw ApiError.notFound('Product not found');
    return product;
  },

  async getById(id: string) {
    const product = await prisma.product.findUnique({ where: { id }, include: { category: true, images: true } });
    if (!product) throw ApiError.notFound('Product not found');
    return product;
  },

  async getFeatured(limit = 8) {
    return prisma.product.findMany({
      where: { isFeatured: true, status: ProductStatus.ACTIVE },
      take: limit,
      include: { category: true, images: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getRelated(productId: string, limit = 4) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound('Product not found');

    return prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        status: ProductStatus.ACTIVE,
        id: { not: productId },
      },
      take: limit,
      include: { images: true },
    });
  },

  // ---------------- Admin ----------------

  async listAllForAdmin(query: ListQuery) {
    const { page, limit, skip } = getPagination(query);
    const where: Prisma.ProductWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.product.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { category: true, images: true } }),
      prisma.product.count({ where }),
    ]);
    return { items, meta: buildMeta(page, limit, total) };
  },

  async create(data: any) {
    const [slugTaken, skuTaken] = await Promise.all([
      prisma.product.findUnique({ where: { slug: data.slug } }),
      prisma.product.findUnique({ where: { sku: data.sku } }),
    ]);
    if (slugTaken) throw ApiError.conflict('A product with this slug already exists');
    if (skuTaken) throw ApiError.conflict('A product with this SKU already exists');

    const product = await prisma.product.create({ data });
    await prisma.inventory.create({ data: { productId: product.id, quantity: data.stock ?? 0 } });
    if (data.stock > 0) {
      await prisma.inventoryLog.create({
        data: { productId: product.id, action: 'STOCK_IN', quantity: data.stock, reason: 'Initial stock' },
      });
    }
    return product;
  },

  async update(id: string, data: any) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw ApiError.notFound('Product not found');
    return prisma.product.update({ where: { id }, data });
  },

  async remove(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw ApiError.notFound('Product not found');
    // Soft-delete via archive to preserve order history integrity
    return prisma.product.update({ where: { id }, data: { status: ProductStatus.ARCHIVED } });
  },

  async addImage(productId: string, url: string, cloudinaryId?: string, position = 0) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound('Product not found');
    return prisma.productImage.create({ data: { productId, url, cloudinaryId, position } });
  },

  async removeImage(imageId: string) {
    const image = await prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image) throw ApiError.notFound('Image not found');
    await prisma.productImage.delete({ where: { id: imageId } });
    return image;
  },
};
