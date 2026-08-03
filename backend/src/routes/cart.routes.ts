import { Router } from 'express';
import * as CartController from '../controllers/cart.controller';
import { validate } from '../middlewares/validate';
import { optionalAuth } from '../middlewares/auth';
import { resolveCartActor } from '../middlewares/guestId';
import { addCartItemSchema, updateCartItemSchema, applyCouponSchema } from '../validators/cart.validator';

const router = Router();

router.use(optionalAuth, resolveCartActor);

router.get('/', CartController.getCart);
router.post('/items', validate(addCartItemSchema), CartController.addItem);
router.patch('/items/:productId', validate(updateCartItemSchema), CartController.updateItem);
router.delete('/items/:productId', CartController.removeItem);
router.delete('/', CartController.clearCart);
router.post('/coupon', validate(applyCouponSchema), CartController.applyCoupon);
router.delete('/coupon', CartController.removeCoupon);

export default router;
