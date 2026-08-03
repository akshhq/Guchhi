import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { sendSuccess } from '../utils/ApiResponse';
import { CategoryService } from '../services/category.service';

export const listCategories = catchAsync(async (req: Request, res: Response) => {
  const categories = await CategoryService.list();
  sendSuccess(res, { categories }, 'Categories fetched');
});

export const listCategoriesAdmin = catchAsync(async (req: Request, res: Response) => {
  const categories = await CategoryService.listAllForAdmin();
  sendSuccess(res, { categories }, 'Categories fetched');
});

export const getCategory = catchAsync(async (req: Request, res: Response) => {
  const category = await CategoryService.getBySlug(req.params.slug);
  sendSuccess(res, { category }, 'Category fetched');
});

export const createCategory = catchAsync(async (req: Request, res: Response) => {
  const category = await CategoryService.create(req.body);
  sendSuccess(res, { category }, 'Category created', 201);
});

export const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const category = await CategoryService.update(req.params.id, req.body);
  sendSuccess(res, { category }, 'Category updated');
});

export const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  await CategoryService.remove(req.params.id);
  sendSuccess(res, {}, 'Category deleted');
});
