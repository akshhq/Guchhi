import { Router } from 'express';
import * as ProductController from '../controllers/product.controller';
import { validate } from '../middlewares/validate';
import { authenticate, authorize } from '../middlewares/auth';
import { upload, validateImageMagicBytes } from '../middlewares/upload';
import { createProductSchema, updateProductSchema } from '../validators/product.validator';
import { recordAudit } from '../middlewares/auditLog';

const router = Router();

// Public
router.get('/', ProductController.listProducts);
router.get('/featured', ProductController.getFeaturedProducts);
router.get('/:id/related', ProductController.getRelatedProducts);
router.get('/slug/:slug', ProductController.getProductBySlug);

// Admin
const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'INVENTORY_MANAGER'] as const;

router.get('/admin/all', authenticate, authorize(...adminRoles), ProductController.listProductsAdmin);
router.get('/admin/:id', authenticate, authorize(...adminRoles), ProductController.getProductById);

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(createProductSchema),
  recordAudit('CREATE_PRODUCT', 'Product'),
  ProductController.createProduct
);
router.patch(
  '/:id',
  authenticate,
  authorize(...adminRoles),
  validate(updateProductSchema),
  recordAudit('UPDATE_PRODUCT', 'Product'),
  ProductController.updateProduct
);
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  recordAudit('DELETE_PRODUCT', 'Product'),
  ProductController.deleteProduct
);

router.post(
  '/:id/images',
  authenticate,
  authorize(...adminRoles),
  upload.single('image'),
  validateImageMagicBytes,
  ProductController.uploadProductImage
);
router.delete('/images/:imageId', authenticate, authorize(...adminRoles), ProductController.deleteProductImage);

export default router;
