import { Router } from 'express';
import * as CouponController from '../../controllers/coupon.controller';
import { validate } from '../../middlewares/validate';
import { authenticate, authorize } from '../../middlewares/auth';
import { createCouponSchema, updateCouponSchema } from '../../validators/coupon.validator';
import { recordAudit } from '../../middlewares/auditLog';

const router = Router();
router.use(authenticate, authorize('ADMIN', 'SUPER_ADMIN'));

router.get('/', CouponController.listCoupons);
router.post('/', validate(createCouponSchema), recordAudit('CREATE_COUPON', 'Coupon'), CouponController.createCoupon);
router.patch('/:id', validate(updateCouponSchema), recordAudit('UPDATE_COUPON', 'Coupon'), CouponController.updateCoupon);
router.delete('/:id', recordAudit('DELETE_COUPON', 'Coupon'), CouponController.deleteCoupon);

export default router;
