import { Router } from 'express';
import * as OrderController from '../controllers/order.controller';
import { validate } from '../middlewares/validate';
import { authenticate } from '../middlewares/auth';
import { cancelOrderSchema } from '../validators/order.validator';

const router = Router();

// Customer routes
router.use(authenticate);
router.get('/', OrderController.listMyOrders);
router.get('/:id', OrderController.getMyOrder);
router.get('/:id/invoice', OrderController.getInvoice);
router.post('/:id/cancel', validate(cancelOrderSchema), OrderController.cancelMyOrder);

export default router;
