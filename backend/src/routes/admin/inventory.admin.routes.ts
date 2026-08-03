import { Router } from 'express';
import { z } from 'zod';
import * as InventoryController from '../../controllers/inventory.controller';
import { validate } from '../../middlewares/validate';
import { authenticate, authorize } from '../../middlewares/auth';
import { recordAudit } from '../../middlewares/auditLog';

const router = Router();
router.use(authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'INVENTORY_MANAGER'));

const adjustStockSchema = z.object({
  body: z.object({ quantity: z.number().int(), reason: z.string().optional() }),
});

router.get('/low-stock', InventoryController.lowStock);
router.get('/logs', InventoryController.logs);
router.post('/:productId/adjust', validate(adjustStockSchema), recordAudit('ADJUST_STOCK', 'Product'), InventoryController.adjustStock);

export default router;
