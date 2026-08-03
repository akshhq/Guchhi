import { PrismaClient, Role, CouponType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ---- Admin user ----
  const adminPasswordHash = await bcrypt.hash('Admin@12345', 12);
  await prisma.user.upsert({
    where: { email: 'admin@guchhi.com' },
    update: {},
    create: {
      firstName: 'Guchhi',
      lastName: 'Admin',
      email: 'admin@guchhi.com',
      passwordHash: adminPasswordHash,
      role: Role.SUPER_ADMIN,
      isEmailVerified: true,
    },
  });

  // ---- Categories (mirrors the existing frontend catalog) ----
  const categories = [
    { name: 'Wild Foraged', slug: 'wild-foraged', description: 'Hand-foraged treasures from Himalayan forests.' },
    { name: 'Grain', slug: 'grain', description: 'Heritage grains grown on terraced hillsides.' },
    { name: 'Legume', slug: 'legume', description: 'Dryland-grown legumes from high-altitude farms.' },
  ];
  const categoryRecords: Record<string, string> = {};
  for (const c of categories) {
    const created = await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
    categoryRecords[c.slug] = created.id;
  }

  // ---- Products (matches js/data/products.js on the frontend) ----
  const products = [
    {
      name: 'Guchhi Mushroom',
      slug: 'morels',
      sku: 'GUC-MOREL-050',
      description:
        'Wild-foraged Himalayan morels, hand-graded and sun-dried for four to six days. The diamond of the forest.',
      price: 1500,
      stock: 42,
      categorySlug: 'wild-foraged',
      weight: '50 g',
      thumbnail: 'media/morels.jpg',
      isFeatured: true,
    },
    {
      name: 'Himalayan Red Rice',
      slug: 'red-rice',
      sku: 'GUC-RICE-1000',
      description:
        'Unpolished red-pericarp rice grown on rain-fed, snowmelt-irrigated terraces in the Shimla hills.',
      price: 650,
      stock: 120,
      categorySlug: 'grain',
      weight: '1 kg',
      thumbnail: 'media/rice.jpg',
      isFeatured: true,
    },
    {
      name: 'Premium Rajma',
      slug: 'rajma',
      sku: 'GUC-RAJMA-500',
      description:
        'Small, thin-skinned Bharmour kidney beans, grown on steep dryland plots at 2,000-2,900 m.',
      price: 450,
      stock: 85,
      categorySlug: 'legume',
      weight: '500 g',
      thumbnail: 'media/rajma.jpg',
      isFeatured: false,
    },
  ];

  for (const p of products) {
    const { categorySlug, ...data } = p;
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: { ...data, categoryId: categoryRecords[categorySlug] },
    });
    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: {},
      create: { productId: product.id, quantity: p.stock },
    });
  }

  // ---- Sample coupon ----
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      description: '10% off your first order',
      type: CouponType.PERCENTAGE,
      value: 10,
      minOrderValue: 500,
      maxDiscountAmount: 200,
      usageLimitPerUser: 1,
      isActive: true,
    },
  });

  // ---- Shipping rate reference ----
  await prisma.shippingRate.upsert({
    where: { id: 'default-flat-rate' },
    update: {},
    create: {
      id: 'default-flat-rate',
      name: 'Standard Shipping',
      flatRate: 99,
      freeAbove: 1500,
    },
  }).catch(() => {
    // upsert on non-unique id fallback for first run
  });

  console.log('Seeding complete.');
  console.log('Admin login -> email: admin@guchhi.com | password: Admin@12345');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
