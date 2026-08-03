import { Router } from 'express';
import * as CategoryController from '../controllers/category.controller';
import { validate } from '../middlewares/validate';
import { authenticate, authorize } from '../middlewares/auth';
import { createCategorySchema, updateCategorySchema } from '../validators/category.validator';
import { recordAudit } from '../middlewares/auditLog';

const router = Router();

router.get('/', CategoryController.listCategories);
router.get('/admin/all', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), CategoryController.listCategoriesAdmin);
router.get('/:slug', CategoryController.getCategory);

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(createCategorySchema),
  recordAudit('CREATE_CATEGORY', 'Category'),
  CategoryController.createCategory
);
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(updateCategorySchema),
  recordAudit('UPDATE_CATEGORY', 'Category'),
  CategoryController.updateCategory
);
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  recordAudit('DELETE_CATEGORY', 'Category'),
  CategoryController.deleteCategory
);

export default router;
