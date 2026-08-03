import { Router } from 'express';
import orderAdminRoutes from './order.admin.routes';
import couponAdminRoutes from './coupon.admin.routes';
import inventoryAdminRoutes from './inventory.admin.routes';
import dashboardAdminRoutes from './dashboard.admin.routes';

const router = Router();

router.use('/orders', orderAdminRoutes);
router.use('/coupons', couponAdminRoutes);
router.use('/inventory', inventoryAdminRoutes);
router.use('/', dashboardAdminRoutes);

export default router;
