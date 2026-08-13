import { Router } from 'express';
import authRoutes from './auth.routes';
import productRoutes from './product.routes';
import categoryRoutes from './category.routes';
import cartRoutes from './cart.routes';
import checkoutRoutes from './checkout.routes';
import orderRoutes from './order.routes';
import reviewRoutes from './review.routes';
import wishlistRoutes from './wishlist.routes';
import addressRoutes from './address.routes';
import contactRoutes from './contact.routes';
import adminRoutes from './admin';
import { healthCheck } from '../controllers/health.controller';

const router = Router();

router.get('/health', healthCheck);

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/cart', cartRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/orders', orderRoutes);
router.use('/reviews', reviewRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/addresses', addressRoutes);
router.use('/contact', contactRoutes);
router.use('/admin', adminRoutes);

export default router;
