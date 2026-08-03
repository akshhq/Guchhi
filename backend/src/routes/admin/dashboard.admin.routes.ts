import { Router } from 'express';
import { z } from 'zod';
import * as AdminController from '../../controllers/admin.controller';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';

const router = Router();
router.use(authenticate, authorize('ADMIN', 'SUPER_ADMIN'));

router.get('/dashboard', AdminController.dashboard);
router.get('/analytics/sales', AdminController.salesAnalytics);
router.get('/analytics/top-products', AdminController.topProducts);

router.get('/customers', AdminController.listCustomers);
router.patch(
  '/customers/:id/status',
  validate(z.object({ body: z.object({ isActive: z.boolean() }) })),
  AdminController.setCustomerActive
);

export default router;
