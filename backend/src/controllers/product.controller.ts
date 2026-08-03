import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { sendSuccess } from '../utils/ApiResponse';
import { ProductService } from '../services/product.service';
import { UploadService } from '../services/upload.service';
import { ApiError } from '../utils/ApiError';

export const listProducts = catchAsync(async (req: Request, res: Response) => {
  const { items, meta } = await ProductService.list(req.query as any);
  sendSuccess(res, { products: items }, 'Products fetched', 200, meta);
});

export const getProductBySlug = catchAsync(async (req: Request, res: Response) => {
  const product = await ProductService.getBySlug(req.params.slug);
  sendSuccess(res, { product }, 'Product fetched');
});

export const getFeaturedProducts = catchAsync(async (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 8;
  const products = await ProductService.getFeatured(limit);
  sendSuccess(res, { products }, 'Featured products fetched');
});

export const getRelatedProducts = catchAsync(async (req: Request, res: Response) => {
  const products = await ProductService.getRelated(req.params.id);
  sendSuccess(res, { products }, 'Related products fetched');
});

// ---------------- Admin ----------------

export const listProductsAdmin = catchAsync(async (req: Request, res: Response) => {
  const { items, meta } = await ProductService.listAllForAdmin(req.query as any);
  sendSuccess(res, { products: items }, 'Products fetched', 200, meta);
});

export const getProductById = catchAsync(async (req: Request, res: Response) => {
  const product = await ProductService.getById(req.params.id);
  sendSuccess(res, { product }, 'Product fetched');
});

export const createProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await ProductService.create(req.body);
  sendSuccess(res, { product }, 'Product created', 201);
});

export const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await ProductService.update(req.params.id, req.body);
  sendSuccess(res, { product }, 'Product updated');
});

export const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  await ProductService.remove(req.params.id);
  sendSuccess(res, {}, 'Product archived');
});

export const uploadProductImage = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('No image file provided');
  const { url, publicId } = await UploadService.uploadBuffer(req.file.buffer);
  const position = req.body.position ? parseInt(req.body.position, 10) : 0;
  const image = await ProductService.addImage(req.params.id, url, publicId, position);
  sendSuccess(res, { image }, 'Image uploaded', 201);
});

export const deleteProductImage = catchAsync(async (req: Request, res: Response) => {
  const image = await ProductService.removeImage(req.params.imageId);
  if (image.cloudinaryId) await UploadService.deleteByPublicId(image.cloudinaryId);
  sendSuccess(res, {}, 'Image deleted');
});
