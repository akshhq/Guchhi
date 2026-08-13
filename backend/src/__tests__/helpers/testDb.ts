/**
 * testDb.ts
 * Shared setup for integration tests. Requires a real Postgres instance —
 * point DATABASE_URL (via .env.test or the environment) at a disposable
 * test database, never at production or dev data, since `resetDb()` wipes
 * every table it touches.
 *
 * Usage in a test file:
 *   import { resetDb, seedProducts } from './helpers/testDb';
 *   beforeEach(async () => {
 *     await resetDb();
 *     await seedProducts();
 *   });
 */
import prisma from '../../config/db';

/**
 * Deletes rows in FK-safe order (children before parents). Add new tables
 * here, above their parent, as the schema grows.
 */
export async function resetDb() {
  await prisma.inventoryLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.couponRedemption.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.address.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
}

export const TEST_PRODUCTS = {
  morels: {
    name: 'Guchhi Mushroom',
    slug: 'morels',
    sku: 'GUC-MOREL-050',
    description: 'Wild-foraged Himalayan morels.',
    price: 1500,
    stock: 5,
    weight: '50 g',
    thumbnail: 'media/morels.jpg',
  },
  rice: {
    name: 'Himalayan Red Rice',
    slug: 'red-rice',
    sku: 'GUC-RICE-1000',
    description: 'Unpolished red-pericarp rice.',
    price: 650,
    stock: 2,
    weight: '1 kg',
    thumbnail: 'media/rice.jpg',
  },
};

/** Seeds a category plus the two products above, mirroring prisma/seed.ts. */
export async function seedProducts() {
  const category = await prisma.category.create({
    data: { name: 'Wild Foraged', slug: 'wild-foraged', description: 'Test category' },
  });

  const morels = await prisma.product.create({
    data: { ...TEST_PRODUCTS.morels, categoryId: category.id },
  });
  const rice = await prisma.product.create({
    data: { ...TEST_PRODUCTS.rice, categoryId: category.id },
  });

  return { category, morels, rice };
}

export async function seedCoupon(overrides: Partial<{
  code: string;
  value: number;
  minOrderValue: number;
  maxDiscountAmount: number;
}> = {}) {
  return prisma.coupon.create({
    data: {
      code: overrides.code ?? 'WELCOME10',
      description: '10% off',
      type: 'PERCENTAGE',
      value: overrides.value ?? 10,
      minOrderValue: overrides.minOrderValue ?? 500,
      maxDiscountAmount: overrides.maxDiscountAmount ?? 200,
      usageLimitPerUser: 1,
      isActive: true,
    },
  });
}

export async function disconnectDb() {
  await prisma.$disconnect();
}
