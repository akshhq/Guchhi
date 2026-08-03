import { Router } from 'express';
import * as OrderController from '../../controllers/order.controller';
import { validate } from '../../middlewares/validate';
import { authenticate, authorize } from '../../middlewares/auth';
import { updateOrderStatusSchema, refundOrderSchema } from '../../validators/order.validator';
import { recordAudit } from '../../middlewares/auditLog';

const router = Router();
router.use(authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'SUPPORT_EXECUTIVE'));

router.get('/', OrderController.listAllOrders);
router.get('/:id', OrderController.getOrderAdmin);
router.patch(
  '/:id/status',
  validate(updateOrderStatusSchema),
  recordAudit('UPDATE_ORDER_STATUS', 'Order'),
  OrderController.updateOrderStatus
);
router.post(
  '/:id/refund',
  authorize('ADMIN', 'SUPER_ADMIN'), // financial action — narrower than the general order-management roles above
  validate(refundOrderSchema),
  recordAudit('REFUND_ORDER', 'Order'),
  OrderController.refundOrder
);

export default router;
