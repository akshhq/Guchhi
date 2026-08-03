import { Router } from 'express';
import * as ReviewController from '../controllers/review.controller';
import { validate } from '../middlewares/validate';
import { authenticate, authorize } from '../middlewares/auth';
import { createReviewSchema, moderateReviewSchema } from '../validators/review.validator';

const router = Router();

router.get('/product/:productId', ReviewController.listProductReviews);
router.post('/', authenticate, validate(createReviewSchema), ReviewController.createReview);

router.get('/admin/pending', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'SUPPORT_EXECUTIVE'), ReviewController.listPendingReviews);
router.patch('/admin/:id/moderate', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'SUPPORT_EXECUTIVE'), validate(moderateReviewSchema), ReviewController.moderateReview);
router.delete('/admin/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), ReviewController.deleteReview);

export default router;
