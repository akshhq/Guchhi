import { Router } from 'express';
import * as CheckoutController from '../controllers/checkout.controller';
import { validate } from '../middlewares/validate';
import { optionalAuth } from '../middlewares/auth';
import { resolveCartActor } from '../middlewares/guestId';
import {
  checkoutSummarySchema,
  createRazorpayOrderSchema,
  createCodOrderSchema,
  verifyPaymentSchema,
} from '../validators/checkout.validator';

const router = Router();

router.use(optionalAuth, resolveCartActor);

router.post('/summary', validate(checkoutSummarySchema), CheckoutController.getSummary);
router.post('/create-order', validate(createRazorpayOrderSchema), CheckoutController.createRazorpayOrder);
router.post('/verify-payment', validate(verifyPaymentSchema), CheckoutController.verifyPayment);
router.post('/cod-order', validate(createCodOrderSchema), CheckoutController.createCodOrder);

export default router;
