import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';

export const CategoryService = {
  async list() {
    return prisma.category.findMany({
      where: { isActive: true },
      include: { children: true },
      orderBy: { name: 'asc' },
    });
  },

  async listAllForAdmin() {
    return prisma.category.findMany({ orderBy: { createdAt: 'desc' } });
  },

  async getBySlug(slug: string) {
    const category = await prisma.category.findUnique({ where: { slug } });
    if (!category) throw ApiError.notFound('Category not found');
    return category;
  },

  async create(data: any) {
    const existing = await prisma.category.findUnique({ where: { slug: data.slug } });
    if (existing) throw ApiError.conflict('A category with this slug already exists');
    return prisma.category.create({ data });
  },

  async update(id: string, data: any) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) throw ApiError.notFound('Category not found');
    return prisma.category.update({ where: { id }, data });
  },

  async remove(id: string) {
    const category = await prisma.category.findUnique({ where: { id }, include: { products: true } });
    if (!category) throw ApiError.notFound('Category not found');
    if (category.products.length > 0) {
      throw ApiError.badRequest('Cannot delete a category that has products. Reassign or remove products first.');
    }
    await prisma.category.delete({ where: { id } });
  },
};
