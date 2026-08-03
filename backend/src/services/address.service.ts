import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';

export const AddressService = {
  async list(userId: string) {
    return prisma.address.findMany({ where: { userId }, orderBy: { isDefault: 'desc' } });
  },

  async create(userId: string, data: any) {
    if (data.isDefault) {
      await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return prisma.address.create({ data: { ...data, userId } });
  },

  async update(userId: string, id: string, data: any) {
    const address = await prisma.address.findFirst({ where: { id, userId } });
    if (!address) throw ApiError.notFound('Address not found');
    if (data.isDefault) {
      await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return prisma.address.update({ where: { id }, data });
  },

  async remove(userId: string, id: string) {
    const address = await prisma.address.findFirst({ where: { id, userId } });
    if (!address) throw ApiError.notFound('Address not found');
    await prisma.address.delete({ where: { id } });
  },
};
