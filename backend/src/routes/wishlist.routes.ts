import { Router } from 'express';
import * as WishlistController from '../controllers/wishlist.controller';
import { validate } from '../middlewares/validate';
import { authenticate } from '../middlewares/auth';
import { wishlistItemSchema } from '../validators/wishlist.validator';

const router = Router();
router.use(authenticate);

router.get('/', WishlistController.getWishlist);
router.post('/', validate(wishlistItemSchema), WishlistController.addToWishlist);
router.delete('/:productId', WishlistController.removeFromWishlist);
router.post('/:productId/move-to-cart', WishlistController.moveToCart);

export default router;
