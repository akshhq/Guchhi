import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase, alphanumeric, hyphen-separated'),
    sku: z.string().min(1),
    description: z.string().min(1),
    price: z.number().positive(),
    salePrice: z.number().positive().optional(),
    stock: z.number().int().min(0).default(0),
    categoryId: z.string().uuid(),
    weight: z.string().optional(),
    thumbnail: z.string().min(1),
    isFeatured: z.boolean().optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED', 'OUT_OF_STOCK']).optional(),
  }),
});

export const updateProductSchema = z.object({
  body: createProductSchema.shape.body.partial(),
});

export const listProductsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    category: z.string().optional(),
    minPrice: z.string().optional(),
    maxPrice: z.string().optional(),
    sort: z.enum(['price_asc', 'price_desc', 'newest', 'popular', 'name_asc']).optional(),
    featured: z.string().optional(),
  }),
});
